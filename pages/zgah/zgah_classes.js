
class V2{ constructor(x, y){ this.x = x; this.y = y; } }

class Mouse {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.down = false;
    }
}

// Lerper is a cool class. It will call a callback and provide a value between 0 and 1 until the
// entire Lerp duration has completed. Lerpers are stored in a global array and handled in the
// main update function. The callback can also optionally have a second parameter that is only
// given as "true" on the final call.
class Lerper {
    constructor(dur, cb) {
        this.dur = dur;
        this.cb = cb;
        this.elapsed = 0;
    }

    Tick(dT) {
        // On the final tick, call the callback with an argument of 1 = 100%.
        if (this.elapsed + dT > this.dur) {
            this.cb(1, true);
            return;
        }

        // Otherwise, do the normal routine.
        this.elapsed += dT;

        this.cb(this.elapsed / this.dur, false);
    }
}

class Ship {
    constructor() {
        this.scale = 25;
        this.x = canvas.width/2;
        this.y = canvas.height/2;
        this.angle = 0;
        this.color = "red";

        this.turnSpeed = 0.002;
        this.moveSpeed = 0.0005;
        this.minAngle = 0.02;

        this.velX = 0;
        this.velY = 0;

        this.target = null;
        this.beaming = false;
        this.beamFactor = 0.0005;
    }

    Tick(dT) {
        // Align current angle with target angle (of mouse) depending on turn speed.
        let targAng = -Math.atan2(mouse.y - canvas.height/2, mouse.x - canvas.width/2);
        let diff = targAng - this.angle;

        if (Math.abs(diff) > Math.PI) {
            diff -= 2*Math.PI * Math.sign(diff);
        }

        if (Math.abs(diff) > this.minAngle) {
            this.angle += diff * this.turnSpeed * dT;

            this.angle += this.angle < -Math.PI ? 2*Math.PI : this.angle > Math.PI ? -2*Math.PI : 0;
        }

        // Move!
        if (mouse.down) {
            this.velX -= dT * this.moveSpeed * Math.cos(this.angle);
            this.velY += dT * this.moveSpeed * Math.sin(this.angle);

            let skew = 0.2;
            let trailLen = 5;
            let num = Math.floor(Math.random() * 2) + 1;
            for (let i = 0; i < num; i++) {
                trails.push(new Trail(this.x - offsetX, this.y - offsetY, this.velX, this.velY, 
                    trailLen, this.angle + skew*Math.random() - skew/2, "#662222", 2000));
            }
        } else {
            this.velX *= 0.98;
            this.velY *= 0.98;
        }

        offsetX += dT * this.velX;
        offsetY += dT * this.velY;

        this.beaming = false;
        if (this.target !== null) {
            if (this.target.scanpc < 1) {
                let dist = Distance(this.x, this.y, this.target.x + offsetX, this.target.y + offsetY);
                if (dist < 200 && keys[81]) {
                    this.beaming = true;

                    this.target.Beam(dT * this.beamFactor);
                }
            }
        }

        this.target = null;
    }
    
    Draw() {
        // q is the offset to the rear points
        let q = Math.PI*11/16;

        ctx.strokeStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x + this.scale*Math.cos(this.angle), this.y - this.scale*Math.sin(this.angle));
        ctx.lineTo(this.x + this.scale*3/4*Math.cos(this.angle + q), this.y - this.scale*3/4*Math.sin(this.angle + q));
        ctx.lineTo(this.x + this.scale*1/6*Math.cos(this.angle + Math.PI), this.y - this.scale*1/6*Math.sin(this.angle + Math.PI));
        ctx.lineTo(this.x + this.scale*3/4*Math.cos(this.angle - q), this.y - this.scale*3/4*Math.sin(this.angle - q));
        ctx.closePath();
        ctx.stroke();

        if (this.target !== null) {
            // DEBUG: draw a highlight if cursor is hovering.
            let l = this.target.x + offsetX - this.target.size - 2;
            let r = this.target.x + offsetX + this.target.size + 2;
            let t = this.target.y + offsetY - this.target.size - 2;
            let b = this.target.y + offsetY + this.target.size + 2;
            ctx.strokeStyle = "red";
            ctx.beginPath();
            ctx.moveTo(l, t + this.target.size/2 + 2);
            ctx.lineTo(l, t);
            ctx.lineTo(l + this.target.size/2 + 2, t);
            ctx.moveTo(r, t + this.target.size/2 + 2);
            ctx.lineTo(r, t);
            ctx.lineTo(r - this.target.size/2 - 2, t);
            ctx.moveTo(l, b - this.target.size/2 - 2);
            ctx.lineTo(l, b);
            ctx.lineTo(l + this.target.size/2 + 2, b);
            ctx.moveTo(r, b - this.target.size/2 - 2);
            ctx.lineTo(r, b);
            ctx.lineTo(r - this.target.size/2 - 2, b);
            ctx.moveTo(r, b - this.target.size/2 - 2);
            ctx.closePath();
            ctx.stroke();

            if (this.target.scanpc < 1) {
                let barwidth = 30;
                ctx.fillStyle = "blue";
                ctx.fillRect(this.target.x + offsetX - barwidth/2, t - 14, barwidth * this.target.scanpc, 10);
                ctx.strokeStyle = "white";
                ctx.strokeRect(this.target.x + offsetX - barwidth/2, t - 14, barwidth, 10);
            }

            // DEBUG: beam to asteroid
            if (this.beaming) {
                ctx.strokeStyle = "blue";
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.target.x + offsetX, this.target.y + offsetY);
                ctx.closePath();
                ctx.stroke();
            }
        }
    }
}

class Asteroid {
    constructor(x, y, s) {
        this.x = x;
        this.y = y;
        this.velM = 0.8;
        this.velX = this.velM * Math.random() - this.velM/2;
        this.velY = this.velM * Math.random() - this.velM/2;
        this.size = s;
        this.active = true;
        this.visType = -1;
        this.type = Math.floor(3*Math.random());

        this.scanpc = 0;

        this.angles = [0];
        this.ds = [this.size];

        this.rotRate = 0.02 * Math.random();
        
        let i = 0;

        while (this.angles[this.angles.length-1] < 2*Math.PI) {
            this.angles.push(this.angles[i] + Math.random() * Math.PI/3 + Math.PI/8);
            this.ds.push(Math.random() * this.size/5 + this.size*9/10);
            i++;
        }

        this.angles.splice(this.angles.length-1, 1);
        this.ds.splice(this.ds.length-1);
    }

    Beam(amt) {
        if (this.scanpc < 1) {
            this.scanpc += amt;
            
            if (this.scanpc >= 1) {
                this.type = this.visType = this.type;
                this.scanpc = 1;
            }
        }
    }

    Tick(dT) {
        if (!this.active) { return; }

        // DEBUG: targeting
        let dist = Distance(this.x + offsetX, this.y + offsetY, mouse.x, mouse.y);
        if (dist < this.size) {
            playerShip.target = this;
        }

        for (let i = 0; i < this.angles.length; i++) {
            this.angles[i] += this.rotRate;
        }

        this.x += this.velX;
        this.y += this.velY;
    }
    
    Draw() {
        if (!this.active) { return; }

        if (this.x + this.size + offsetX > 0 && this.x - this.size + offsetX < canvas.width &&
            this.y + this.size + offsetY > 0 && this.y - this.size + offsetY < canvas.height)
        {
            if (this.visType === 0) {
                ctx.strokeStyle = "#aaffaa";
            } else if (this.visType === 1) {
                ctx.strokeStyle = "#aaaaff";
            } else if (this.visType === 2) {
                ctx.strokeStyle = "#ffffaa";
            } else { ctx.strokeStyle = "white"; }

            /* TODO: remove old way
            ctx.beginPath();
            ctx.arc(this.x + offsetX, this.y + offsetY, this.size, 0, 2*Math.PI);
            ctx.closePath();
            ctx.stroke();
            */

            ctx.beginPath();
            console.log("" + (this.x + this.ds[0] * Math.cos(this.angles[0]) + offsetX));
            ctx.moveTo(this.x + this.ds[0] * Math.cos(this.angles[0]) + offsetX, 
                this.y + this.ds[0] * Math.sin(this.angles[0]) + offsetY);
            for (let i = 1; i < this.angles.length; i++) {
                ctx.lineTo(this.x + this.ds[i] * Math.cos(this.angles[i]) + offsetX, 
                    this.y + this.ds[i] * Math.sin(this.angles[i]) + offsetY);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }
}

class Trail {
    constructor(x, y, velX, velY, len, ang, c, life) {
        this.x = x;
        this.y = y;
        this.velX = velX;
        this.velY = velY;
        this.len = len;
        this.ang = ang;
        this.color = c;
        this.life = life;
        this.active = true;

        this.size = 3;

        this.type = 1;
        
        this.cos = this.len * Math.cos(-this.ang);
        this.sin = this.len * Math.sin(-this.ang);
    }

    Tick(dT) {
        if (!this.active) { return; }

        this.life -= dT;
        
        if (this.life <= 0) {
            this.active = false;
        }

        this.x -= (0.1 * this.cos + this.velX) * dT;
        this.y -= (0.1 * this.sin + this.velY) * dT;
    }

    Draw() {
        if (!this.active) { return; }

        ctx.strokeStyle = this.color;
        if (this.type === 0) {
            ctx.beginPath();
            ctx.moveTo(this.x - this.cos + offsetX, this.y - this.sin + offsetY);
            ctx.lineTo(this.x + this.cos + offsetX, this.y + this.sin + offsetY);
            ctx.closePath();
            ctx.stroke();
        } else if (this.type === 1) {
            ctx.beginPath();
            ctx.arc(this.x + offsetX, this.y + offsetY, this.size, 0, 2*Math.PI);
            ctx.closePath();
            ctx.stroke();
        }
    }
}
