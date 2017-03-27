/* eslint radix: 0, id-length: 0, camelcase: 0 */
/* global Raster, Path, view, project, Point, Color */

/*********************** EVOLUTION *****************************/

function Evolution (raster){
    this.target = getImageData(raster);
    this.population = [];
    this.head = null;

    var black = new Path.Rectangle(0, 0, 128, 128);
    for (var i = 0; i < 6; i++){
        var individual = new Layer();
        individual.visible = false;
        individual.addChild(black.clone());
        for (var j = 0; j < 4; j++){
            var shape = generateShape(3);
            console.log('shape', shape.fillColor)
            individual.addChild(generateShape(3))
        }
        this.population.push(new Chromosome(individual), this.target);
    }
    black.remove();
}

// "hill climbing algorithm" - is this different from brute force?
Evolution.prototype.evolve = function(){

    this.population = this.population
                    .sort(function(a, b){
                        var costA = a.cost || a.getFitness();
                        var costB = b.cost || b.getFitness();
                        return costA - costB;
                    })

    for (var i = 0; i < 3; i++){ // remove 3, then create 3
        this.population.pop().remove();
    }

    for (var i = 0; i < 3; i++){
        this.population.push(
            this.population[i].mate(this.population[between(0, 3)])
        )
    }

    this.head.layer.visible = false;
    this.head = this.population[0];
    this.head.show();
}


/*********************** CHROMOSOME ****************************/

function Chromosome (layer, targetData){
    this.targetData = targetData;

    this.layer = layer; // each layer contains all our polygons
    this.polygons = layer.children;

    // chromosome-level mutations: insertion/deletion
    // ... would shuffling the polygon stack do anything?
    this.chromosomeMutations = [
        new Mutation(
            "insertion",
            1/700,
            Chromosome.prototype.addPolygon, Chromosome.prototype.addPolygon_valid
        ),
        new Mutation(
            "deletion",
            1/1500,
            Chromosome.prototype.removePolygon, Chromosome.prototype.removePolygon_valid
        )
    ];

    /**
     * polygon-level mutations:
     * - change shape (add/remove point)
     * - change color
     * - change position
     */
    this.polygonMutations = [
        new Mutation("addPoint", 1/1000, Chromosome.prototype.addPoint, Chromosome.prototype.addPoint_valid),
        new Mutation("removePoint", 1/1000, Chromosome.prototype.removePoint, Chromosome.prototype.removePoint_valid),
        new Mutation("transform", 1/1000, Chromosome.prototype.transform, Chromosome.prototype.transform_valid),
        new Mutation("recolor", 1/1500, Chromosome.prototype.recolor, Chromosome.prototype.recolor_valid)
    ];
}

// Chromosome-level mutations
var chromosomeMutations = {
    addPolygon: function (){
        this.layer.addChild(generateShape(3))
    },
    removePolygon: function (){
        var index = parseInt(Math.random() * this.polygons.length);
        this.polygons[index].remove();
    }
};

// Polygon-level mutations
var polygonMutations = {
    addPoint: function (index){
        this.polygons[index].insert(
            between(0, this.polygons.length - 1),
            new Point(between(0, 128), between(0, 128))
        )
    },
    removePoint: function (index){
        this.polygons[index].removeSegment(between(0, this.polygons.length - 1));
    },
    transform: function(index){
        var rand = Math.random();
        if (rand < 0.3)
            return this.polygons[index].position += new Point(between(0, 20), between(0, 20))
        if (rand > 0.7)
            return this.polygons.scale = Math.random() + 0.5;

        return this.polygons.rotate = between(0, 360);
    },
    recolor: function(index){
        this.polygons[index].fillColor = new Color(
            Math.random(),
            Math.random(),
            Math.random(),
            Math.random()
        )
    }
}

// validations
var validations = {
    addPolygon_valid: function (){
        return this.polygons.length < 50;
    },
    removePolygon_valid: function (){
        return this.polygons.length > 1;
    },
    addPoint_valid: function (index){
        return this.polygons[index].segments.length < 8;
    },
    removePoint_valid: function (index){
        return this.polygons[index].segments.length > 3;
    },
    transform_valid: function(index){
        return this.polygons.length > 0;
    },
    recolor_valid: function(index){
        return this.polygons.length > 0;
    }
}

Chromosome.prototype = Object.assign(
    chromosomeMutations,
    polygonMutations,
    validations
);

Chromosome.prototype.mate = function(partner){
    var newLayer = new Layer();
    newLayer.visible = false;

    for (var i = 0; i < 25; i++){
        newLayer.addChild(this.polygons[i].clone())
    }
    for (var i = 25; i < 50; i++){
        newLayer.addChild(partner.polygons[i].clone())
    }
    var baby = new Chromosome(newLayer, this.targetData);
    return baby.mutate();
};

Chromosome.prototype.mutate = function () {
    var mutated = false;
    while (!mutated) {
        this.chromosomeMutations.forEach(function(mutation) {
            if (mutation.isValid.apply(this)) {
                if (Math.random() < mutation.probability) {
                    mutated = true;
                    mutation.mutate.apply(this);
                }
            }
        }, this)

        this.polygons.forEach(function(polygon, index) {
            this.polygonMutations.forEach(function(mutation) {
                if (mutation.isValid.apply(this, [index])) {
                    if (Math.random() < mutation.probability) {
                        mutated = true;
                        mutation.mutate.apply(this, [index]);
                    }
                }
            }, this);
        }, this)
    }
    return this;
};

Chromosome.prototype.getFitness = function(){
    var data = getImageData(this.layer);
    this.cost = costFn(data, this.targetData);
    return this.cost;
};

Chromosome.prototype.show = function(){
    this.layer.visible = true;
}

Chromosome.prototype.remove = function(){
    this.layer.remove();
}

/*********************** MUTATION ******************************/

function Mutation (type, probability, mutate, isValid) {
    /*
        Create a common interface for the mutations
    */
    this.type = type;
    this.probability = probability;
    this.mutate = mutate;
    this.isValid = isValid;
    this.index = undefined;
}

/************************  UTILS  *******************************/

function getImageData(input){
    var raster;
    if (input instanceof Raster){
        raster = input;
    } else { // it's a layer
        var originalVisiblity = input.visible;
        input.visible = true;
        console.log(input.children);
        var fullRaster = input.rasterize();
        raster = fullRaster.getSubRaster(0, 0, 128, 128);
        fullRaster.remove();
    }
    raster.remove();
    input.visible = originalVisiblity;
    return raster.getImageData().data;
}

/**
 * Cost function
 * You probably want to delegate this operation to a web worker
 */
function costFn (rasterData, targetData){
    return Math.sqrt(
        rasterData
            .reduce(function(acc, rgbValue, i){
                return acc + (rgbValue - targetData[i]) * (rgbValue - targetData[i]);
            }, 0)
    )
}

// getchu a random integer between start up to and not including end
function between(start, end){
    return start + parseInt((Math.random() * (end - start)));
}

function generateShape (sides){
    var polygon = new Path();
    polygon.fillColor = new Color(
            Math.random(),
            Math.random(),
            Math.random(),
            Math.random()
        );
    polygon.opacity = 0.2;
    polygon.fillColor.hue += between(0, 360);

    for (var i = 0; i < sides; i++){
        polygon.add(new Point(between(0, 128), between(0, 128)))
    }

    polygon.closed = true;
    return polygon;
}

/**************************************************************************** */


// start it up.
var pearlRaster = new Raster('pearl')
var evoPearl = new Evolution(pearlRaster);
var generationBox = document.getElementById('generation');
var runningBox = document.getElementById('running');

var go = function (event) {
    if (event.count % 100 === 0) {
        generationBox.innerHTML = event.count;
    }
    evoPearl.evolve();
}

view.onMouseDown = function (event){
    view.onFrame = view.onFrame ? null : go;
    runningBox.innerHTML = view.onFrame ? 'Running...' : 'Paused.'
}