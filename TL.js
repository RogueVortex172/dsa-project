window.onload = function () {
    const canvas = document.getElementById('simulation-canvas');
    const ctx = canvas.getContext('2d');
    if (!canvas || !ctx) return;
  
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      themeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
    });
  
    // Simulation state
    let vehicles = [];
    let trafficLights = {
      horizontalLeft: "stop",
      horizontalRight: "stop",
      verticalUp: "go",
      verticalDown: "go"
    };
    let timer = 5;
    let simulationRunning = false;
    let collisionDetected = false;
  
    const vehicleColors = ["#4fab52", "#f7b731", "#eb3b5a", "#3867d6", "#8854d0"];
    const MIN_DISTANCE = 25;
    const LANE_WIDTH = 50;
    const MAX_VEHICLES_PER_LANE = 5;
  
    class Vehicle {
      constructor(x, y, direction, lane, speed, color) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.lane = lane;
        this.speed = speed * (lane === "right" || lane === "down" ? -1 : 1);
        this.width = direction === "horizontal" ? 22 : 12;
        this.height = direction === "horizontal" ? 12 : 22;
        this.color = color;
        this.stopped = false;
      }
  
      move() {
        let beforeJunction = false;
        if (this.direction === "horizontal") {
          if (this.lane === "left") beforeJunction = this.x >= 140 && this.x < 200;
          else beforeJunction = this.x <= 360 && this.x > 300;
        } else {
          if (this.lane === "up") beforeJunction = this.y >= 140 && this.y < 200;
          else beforeJunction = this.y <= 360 && this.y > 300;
        }
        let inJunction = (this.x >= 200 && this.x <= 300) && (this.y >= 200 && this.y <= 300);
        let canMove = true;
        if (beforeJunction) {
          if (this.direction === "horizontal" && this.lane === "left" && trafficLights.horizontalLeft === "stop") canMove = false;
          if (this.direction === "horizontal" && this.lane === "right" && trafficLights.horizontalRight === "stop") canMove = false;
          if (this.direction === "vertical" && this.lane === "up" && trafficLights.verticalUp === "stop") canMove = false;
          if (this.direction === "vertical" && this.lane === "down" && trafficLights.verticalDown === "stop") canMove = false;
        }
        const nearbyVehicle = this.checkNearbyVehicles();
        if (nearbyVehicle && !inJunction) {
          const distance = this.direction === "horizontal"
            ? Math.abs(this.x - nearbyVehicle.x)
            : Math.abs(this.y - nearbyVehicle.y);
          if (distance < MIN_DISTANCE) canMove = false;
        }
        if (canMove) {
          this.stopped = false;
          if (this.direction === "horizontal") {
            this.x += this.speed;
            if (this.speed > 0 && this.x > canvas.width) this.x = -this.width;
            if (this.speed < 0 && this.x < -this.width) this.x = canvas.width;
          } else {
            this.y += this.speed;
            if (this.speed > 0 && this.y > canvas.height) this.y = -this.height;
            if (this.speed < 0 && this.y < -this.height) this.y = canvas.height;
          }
        } else {
          this.stopped = true;
        }
      }
  
      checkNearbyVehicles() {
        return vehicles.find(v => {
          if (v === this) return false;
          if (this.direction !== v.direction || this.lane !== v.lane) return false;
          if (this.direction === "horizontal") {
            const sameDirection = (this.speed > 0 && v.x > this.x) || (this.speed < 0 && v.x < this.x);
            return sameDirection && Math.abs(v.x - this.x) < MIN_DISTANCE + this.width &&
              Math.abs(v.y - this.y) < this.height;
          } else {
            const sameDirection = (this.speed > 0 && v.y > this.y) || (this.speed < 0 && v.y < this.y);
            return sameDirection && Math.abs(v.y - this.y) < MIN_DISTANCE + this.height &&
              Math.abs(v.x - this.x) < this.width;
          }
        });
      }
  
      draw() {
        ctx.save();
        ctx.shadowColor = "#222";
        ctx.shadowBlur = 6;
        ctx.fillStyle = this.color;
        if (this.direction === "vertical") {
          ctx.translate(this.x + this.width/2, this.y + this.height/2);
          ctx.rotate(Math.PI/2);
          ctx.fillRect(-this.height/2, -this.width/2, this.height, this.width);
        } else {
          ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        ctx.restore();
      }
  
      getBoundingBox() {
        return {
          left: this.x,
          right: this.x + this.width,
          top: this.y,
          bottom: this.y + this.height
        };
      }
    }
  
    function countVehiclesInLane(direction, lane) {
      return vehicles.filter(v => v.direction === direction && v.lane === lane).length;
    }
  
    function checkCollisions() {
      collisionDetected = false;
      for (let i = 0; i < vehicles.length; i++) {
        for (let j = i + 1; j < vehicles.length; j++) {
          let v1 = vehicles[i];
          let v2 = vehicles[j];
          let box1 = v1.getBoundingBox();
          let box2 = v2.getBoundingBox();
          if (
            box1.left < box2.right &&
            box1.right > box2.left &&
            box1.top < box2.bottom &&
            box1.bottom > box2.top
          ) {
            collisionDetected = true;
            // Collision response: nudge vehicles apart
            if (v1.direction === "horizontal" && v2.direction === "horizontal") {
              v1.x -= Math.sign(v1.speed) * 3;
              v2.x -= Math.sign(v2.speed) * 3;
            } else if (v1.direction === "vertical" && v2.direction === "vertical") {
              v1.y -= Math.sign(v1.speed) * 3;
              v2.y -= Math.sign(v2.speed) * 3;
            } else {
              if (v1.direction === "horizontal") {
                v1.x -= Math.sign(v1.speed) * 3;
                v2.y -= Math.sign(v2.speed) * 3;
              } else {
                v1.y -= Math.sign(v1.speed) * 3;
                v2.x -= Math.sign(v2.speed) * 3;
              }
            }
          }
        }
      }
    }
  
    function drawMap() {
      // Road background
      ctx.fillStyle = "#4FAB52";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
  
      // Main roads
      ctx.fillStyle = "#23272f";
      ctx.fillRect(200, 0, 100, canvas.height);
      ctx.fillRect(0, 200, canvas.width, 100);
  
      // Lane markings
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 12]);
      ctx.beginPath();
      ctx.moveTo(250, 0);
      ctx.lineTo(250, canvas.height);
      ctx.moveTo(0, 250);
      ctx.lineTo(canvas.width, 250);
      ctx.stroke();
      ctx.setLineDash([]);
  
      // Junction
      ctx.fillStyle = collisionDetected ? "#eb3b5a" : "#111";
      ctx.fillRect(200, 200, 100, 100);
  
      // Zebra crossings
      ctx.fillStyle = "white";
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(240, 205 + i * 20, 20, 10);
        ctx.fillRect(205 + i * 20, 240, 10, 20);
      }
    }
  
    function drawTrafficLights() {
      // Traffic light backgrounds
      ctx.save();
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 12;
  
      // Horizontal Left (left-to-right)
      ctx.fillStyle = "#23272f";
      ctx.fillRect(80, 250, 40, 40);
      ctx.fillStyle = trafficLights.horizontalLeft === "stop" ? "#eb3b5a" : "#4fab52";
      ctx.beginPath();
      ctx.arc(100, 270, 15, 0, Math.PI * 2);
      ctx.fill();
  
      // Horizontal Right (right-to-left)
      ctx.fillStyle = "#23272f";
      ctx.fillRect(380, 250, 40, 40);
      ctx.fillStyle = trafficLights.horizontalRight === "stop" ? "#eb3b5a" : "#4fab52";
      ctx.beginPath();
      ctx.arc(400, 270, 15, 0, Math.PI * 2);
      ctx.fill();
  
      // Vertical Up (bottom-to-top)
      ctx.fillStyle = "#23272f";
      ctx.fillRect(250, 80, 40, 40);
      ctx.fillStyle = trafficLights.verticalUp === "stop" ? "#eb3b5a" : "#4fab52";
      ctx.beginPath();
      ctx.arc(270, 100, 15, 0, Math.PI * 2);
      ctx.fill();
  
      // Vertical Down (top-to-bottom)
      ctx.fillStyle = "#23272f";
      ctx.fillRect(250, 380, 40, 40);
      ctx.fillStyle = trafficLights.verticalDown === "stop" ? "#eb3b5a" : "#4fab52";
      ctx.beginPath();
      ctx.arc(270, 400, 15, 0, Math.PI * 2);
      ctx.fill();
  
      ctx.restore();
    }
  
    function drawTimer() {
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = "#23272f";
      ctx.fillRect(350, 20, 60, 40);
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = "#fff";
      ctx.font = "bold 22px Inter, Arial";
      ctx.textAlign = "center";
      ctx.fillText(timer, 380, 48);
      ctx.restore();
    }
  
    function updateSimulation() {
      if (!simulationRunning) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawMap();
      drawTrafficLights();
      drawTimer();
      vehicles.forEach(vehicle => {
        vehicle.move();
        vehicle.draw();
      });
      checkCollisions();
      requestAnimationFrame(updateSimulation);
    }
  
    function switchTrafficLights() {
      if (timer === 0) {
        // Alternate between horizontal and vertical traffic
        if (trafficLights.horizontalLeft === "stop") {
          trafficLights.horizontalLeft = "go";
          trafficLights.horizontalRight = "go";
          trafficLights.verticalUp = "stop";
          trafficLights.verticalDown = "stop";
        } else {
          trafficLights.horizontalLeft = "stop";
          trafficLights.horizontalRight = "stop";
          trafficLights.verticalUp = "go";
          trafficLights.verticalDown = "go";
        }
        timer = 5;
      } else {
        timer--;
      }
      setTimeout(switchTrafficLights, 1000);
    }
  
    function addVehicles() {
      vehicles = [];
      // Add up to 2 vehicles per lane initially
      for (let i = 0; i < 2; i++) {
        vehicles.push(new Vehicle(-50 - i * MIN_DISTANCE, 225, "horizontal", "left", 2, vehicleColors[i]));
        vehicles.push(new Vehicle(canvas.width + i * MIN_DISTANCE, 275, "horizontal", "right", 2, vehicleColors[i+1]));
        vehicles.push(new Vehicle(225, -50 - i * MIN_DISTANCE, "vertical", "up", 2, vehicleColors[i+2]));
        vehicles.push(new Vehicle(275, canvas.height + i * MIN_DISTANCE, "vertical", "down", 2, vehicleColors[i+3]));
      }
    }
  
    setInterval(() => {
      if (simulationRunning) {
        const direction = Math.random() > 0.5 ? "horizontal" : "vertical";
        const lane = Math.random() > 0.5 ?
          (direction === "horizontal" ? "left" : "up") :
          (direction === "horizontal" ? "right" : "down");
        if (countVehiclesInLane(direction, lane) < MAX_VEHICLES_PER_LANE) {
          let x, y;
          if (direction === "horizontal") {
            x = lane === "left" ? -50 : canvas.width;
            y = lane === "left" ? 225 : 275;
          } else {
            x = lane === "up" ? 225 : 275;
            y = lane === "up" ? -50 : canvas.height;
          }
          vehicles.push(new Vehicle(
            x, y, direction, lane, 2,
            vehicleColors[Math.floor(Math.random() * vehicleColors.length)]
          ));
        }
      }
    }, 2000);
  
    document.getElementById("start-simulation").addEventListener("click", () => {
      simulationRunning = true;
      if (vehicles.length === 0) addVehicles();
      updateSimulation();
      switchTrafficLights();
    });
  
    document.getElementById("pause-simulation").addEventListener("click", () => {
      simulationRunning = false;
    });
  
    document.getElementById("reset-simulation").addEventListener("click", () => {
      vehicles = [];
      simulationRunning = false;
      trafficLights = { horizontalLeft: "stop", horizontalRight: "stop", verticalUp: "go", verticalDown: "go" };
      timer = 5;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawMap();
      drawTrafficLights();
      drawTimer();
    });
  
    // Initial render
    drawMap();
    drawTrafficLights();
    drawTimer();
  };
  