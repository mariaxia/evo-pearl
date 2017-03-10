var globes = [];

function random(type){
    switch (type) {
        case 'x':
            return parseInt(Math.random() * view.size.width);
        case 'y':
            return parseInt(Math.random() * view.size.height);
        case 'radius':
            return parseInt(60 + Math.random() * 40)
        default: 
            return 1
    }
}

function Globe (){
    this.center = {
        x: random('x'),
        y: random('y')
    }
    this.radius = random('radius')
}

Globe.prototype.draw = function (){
    this.path = new Path.Circle(new Point(this.center.x, this.center.y), this.radius);
    this.path.fillColor = "AliceBlue"
    this.path.strokeColor = "black";
}

Globe.prototype.react = function (){
    // react to other globes (x & y and boundaries)

    // react to gravity (y coord)
}



for (var i = 0; i < 10; i++){
    globes.push(new Globe())
    globes[i].draw()
    globes[i].path.onMouseDown = function(e){
        console.log('hi')
    }
}