class Floor {
  static floorHeight = 14;
  constructor(number, yPosition, isWaiting = false) {
    this.number = number;
    this.yPosition = yPosition;
    this.isWaiting = isWaiting;
  }

  draw(ctx, canvasWidth, canvasHeight) {
    ctx.fillStyle = "black";
    const yPosition = canvasHeight - this.number * Floor.floorHeight;
    ctx.fillText(`Floor ${this.number}`, 10, yPosition + Floor.floorHeight - 2);

    ctx.beginPath();
    ctx.moveTo(0, yPosition);
    ctx.lineTo(canvasWidth, yPosition);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(110, yPosition);
    ctx.lineTo(110, yPosition + canvasHeight);
    ctx.stroke();

    if (this.isWaiting) {
      ctx.fillStyle = "red";
      ctx.fillText("Waiting", 115, this.yPosition * Floor.floorHeight);
      ctx.stroke();
    }
  }
}

class Elevator {
  static maxPerson = 2;
  constructor(
    id,
    gapBetween = 0,
    currentFloor = 1,
    previousFloor = 1,
    targetFloor = 1,
    animationId = null,
    state = 0,
    elevatorWidth = 10,
    elevatorHeight = 13,
    moveUpFloorTargets = [],
    moveDownFloorTargets = []
  ) {
    this.id = id;
    this.gapBetween = gapBetween;
    this.currentFloor = currentFloor;
    this.previousFloor = previousFloor;
    this.targetFloor = targetFloor;
    this.animationId = animationId;
    this.state = state;
    this.elevatorWidth = elevatorWidth;
    this.elevatorHeight = elevatorHeight;
    this.moveUpFloorTargets = moveUpFloorTargets;
    this.moveDownFloorTargets = moveDownFloorTargets;
  }

  drawBox(ctx, xPos, yPos, wVal, hVal) {
    ctx.fillStyle = "red";
    ctx.fillRect(xPos, yPos, wVal, hVal);
  }

  draw(ctx, canvasHeight, floorHeight) {
    const pos = 55 + this.gapBetween;
    this.drawBox(
      ctx,
      pos,
      canvasHeight -
        this.currentFloor * floorHeight +
        (floorHeight - this.elevatorHeight),
      this.elevatorWidth,
      this.elevatorHeight
    );
  }
}

class ElevatorSystem {
  constructor(canvas, ctx, floors = [], elevators = [], queue = []) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.floors = floors;
    this.elevators = elevators;
    this.queue = queue;
  }

  drawFloors() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.floors.forEach((floor) => {
      floor.draw(this.ctx, this.canvas.width, this.canvas.height);
    });
  }

  drawElevators() {
    this.elevators.forEach((elevator) => {
      elevator.draw(this.ctx, this.canvas.height, Floor.floorHeight);
    });
  }

  async animateElevator(elevator, from, to, resolve) {
    const targetFloor = this.floors.find((floor) => {
      const number = elevator.state && elevator.state == 1 ? from : to;
      return floor.number === number;
    });

    elevator.targetFloor = targetFloor.number;
    if (elevator.currentFloor < elevator.targetFloor) {
      let gap = elevator.targetFloor - elevator.currentFloor; // 50 - 10 = 40
      let inLinear = parseInt(elevator.targetFloor / 5); // 50 / 5 = 10
      if (gap < 5) {
        // slower movement on near floor
        elevator.currentFloor += 0.1; // Speed of the elevator
      } else if (
        elevator.currentFloor === 0 &&
        elevator.currentFloor <= inLinear
      ) {
        elevator.currentFloor += 0.1;
      } else if (
        elevator.currentFloor > 0 &&
        elevator.currentFloor - 5 < inLinear
      ) {
        elevator.currentFloor += 0.1;
      } else {
        elevator.currentFloor += 0.2; // Speed of the elevator
      }
      if (elevator.currentFloor > elevator.targetFloor)
        elevator.currentFloor = elevator.targetFloor;
    } else if (elevator.currentFloor > elevator.targetFloor) {
      let gap = elevator.currentFloor - elevator.targetFloor;
      if (elevator.previousFloor > 0) {
        let inLinear = parseInt(elevator.previousFloor / 5);
        if (gap < 5) {
          elevator.currentFloor -= 0.1; // Speed of the elevator
        } else if (elevator.currentFloor > parseInt(inLinear * 5)) {
          elevator.currentFloor -= 0.1;
        } else {
          elevator.currentFloor -= 0.2; // Speed of the elevator
        }
      } else {
        if (gap < 5) {
          elevator.currentFloor -= 0.1; // Speed of the elevator
        } else {
          elevator.currentFloor -= 0.2; // Speed of the elevator
        }
      }

      if (elevator.currentFloor < elevator.targetFloor) {
        elevator.currentFloor = elevator.targetFloor;
      }
    }

    this.draw();

    if (elevator.currentFloor !== elevator.targetFloor) {
      elevator.animationId = requestAnimationFrame(() =>
        this.animateElevator(elevator, from, to, resolve)
      );
    } else {
      if (elevator.state === 1) {
        const currentFloor = this.floors.find(
          (floor) => floor.number === elevator.currentFloor
        );
        currentFloor.isWaiting = false;
        setTimeout(() => {
          elevator.state = 2;
          elevator.targetFloor = to;
          elevator.animationId = requestAnimationFrame(() =>
            this.animateElevator(elevator, from, to, resolve)
          );
        }, 1000);
      } else {
        elevator.previousFloor = elevator.currentFloor;
        cancelAnimationFrame(elevator.animationId);
        elevator.state = 0;
        updateDeliverCount(1);
        resolve();
      }
    }
  }

  populateWaitingFloors() {
    this.floors.forEach((floor) => {
      const queueItem = this.queue.find(
        (queueItem) => queueItem.from === floor.number
      );
      floor.isWaiting = queueItem !== undefined;
    });
  }

  draw() {
    this.drawFloors();
    this.drawElevators();
  }

  start() {
    updateDeliverCount();
    this.populateWaitingFloors();
    const promises = this.elevators.map(
      (elevator) =>
        new Promise((resolve) => {
          (async () => {
            if (elevator.state === 0) {
              elevator.state = 1;
              const queueItem = this.queue.shift();
              if (queueItem === undefined) {
                return resolve();
              }

              this.animateElevator(
                elevator,
                queueItem.from,
                queueItem.to,
                resolve
              );
            }
          })();
        })
    );
    Promise.all(promises).then(() => {
      finishTime = new Date();
      updateDeliverCount();
      if (this.queue.length) {
        this.start();
      }
    });
  }
}

const canvas = document.getElementById("elevatorCanvas");
const ctx = canvas.getContext("2d");
const elevators = [
  new Elevator(1, 0),
  new Elevator(2, 15),
  new Elevator(3, 30),
];

const floors = [];
const totalFloors = 50;
for (let index = 1; index <= totalFloors; index++) {
  const yPosition = Math.abs(index - 1 - totalFloors);
  floors.push(new Floor(index, yPosition));
}

const elevatorSystem = new ElevatorSystem(canvas, ctx, floors, elevators, mans);
elevatorSystem.draw();

let startTime = new Date();
let finishTime;
let deliveredCount = 0;
function updateDeliverCount(v) {
  if (v !== undefined && v > 0) {
    deliveredCount += v;
  }
  document.getElementById("startTime").innerHTML = startTime.toLocaleString();

  if (finishTime) {
    document.getElementById("finishTime").innerHTML =
      finishTime.toLocaleString();
    document.getElementById("gapTime").innerHTML = getDateTimeSince(startTime);
  }

  document.getElementById("counter").innerHTML = deliveredCount;
}
