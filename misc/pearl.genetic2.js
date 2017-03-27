/* eslint radix: 0, id-length: 0, camelcase: 0 */
/* global Raster, Path, view, project, Point, Color */

/*********************** EVOLUTION *****************************/

function Evolution (raster){
    this.target = getImageData(raster);
    this.population = [];

    var bg = new Path.Rectangle(0, 0, 128, 128);
    bg.fillColor = '#111111';

    for (var i = 0; i < 4; i++){
        var individual = new Layer();
        individual.addChild(bg.clone());

        for (var j = 0; j < 4; j++){
            individual.addChild(generateShape(3))
        }
        individual.visible = false;
        this.population.push(new Chromosome(individual, this.target));
    }

    bg.remove();

    this.head = null;
}

// "hill climbing algorithm"
Evolution.prototype.evolve = function(){
    this.population = this.population
                        .sort(function(a, b){
                            var aCost = a.cost || a.getFitness();
                            var bCost = b.cost || b.getFitness();
                            return aCost - bCost;
                        })

    if (this.head) this.head.remove();
    this.head = this.population[0];
    this.head.show();

    this.population.pop().remove();
    this.population.pop().remove(); // remove 2, then create 2


    this.population.push(
        this.population[0].mate(this.population[1])
    );
    this.population.push(
        this.population[1].mate(this.population[0])
    );
}


/*********************** CHROMOSOME ****************************/

function Chromosome (layer, targetData){
    this.targetData = targetData;

    this.layer = layer; // each layer contains all our polygons
    this.polygons = layer.children;

    // chromosome-level mutations: insertion/deletion
    // ... would shuffling the polygon stack do anything?
    this.chromosomeMutations = [
        new Mutation("insertion", 1/700, Chromosome.prototype.addPolygon, Chromosome.prototype.addPolygon_valid),
        new Mutation("deletion", 1/1500, Chromosome.prototype.removePolygon, Chromosome.prototype.removePolygon_valid)
    ];

    /**
     * polygon-level mutations:
     * - change shape (add/remove point)
     * - change color
     * - change position
     */
    this.polygonMutations = [
        new Mutation("addPoint", 1/1500, Chromosome.prototype.addPoint, Chromosome.prototype.addPoint_valid),
        new Mutation("removePoint", 1/1500, Chromosome.prototype.removePoint, Chromosome.prototype.removePoint_valid),
        new Mutation("transform", 1/1500, Chromosome.prototype.transform, Chromosome.prototype.transform_valid),
        new Mutation("recolor", 1/1500, Chromosome.prototype.recolor, Chromosome.prototype.transform_valid)
        // new Mutation("opacity", 1/1500, Chromosome.prototype.opacity, Chromosome.prototype.transform_valid),
        // new Mutation("saturation", 1/1500, Chromosome.prototype.saturation, Chromosome.prototype.transform_valid),
        // new Mutation("brightness", 1/1500, Chromosome.prototype.brightness, Chromosome.prototype.transform_valid)
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
            return this.polygons[index].position += new Point(between(0, 30), between(0, 30))
        if (rand > 0.7)
            return this.polygons.scale = Math.random() + 0.5;

        return this.polygons.rotate = between(0, 360);
    },
    recolor: function(index){
        this.polygons[index].fillColor = new Color(
            Math.random(),
            Math.random(),
            Math.random(),
            Math.random() * 0.7
        )
    }
    // opacity: function(index){
    //     this.polygons[index].opacity = Math.random();
    // },
    // saturation: function(index){
    //     this.polygons[index].saturation = Math.random();
    // },
    // brightness: function(index){
    //     this.polygons[index].brightness = Math.random();
    // }
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
    transform_valid: function(index){ // this one gets re-used
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
    for (var i = 0; i < parseInt(this.polygons.length / 2); i++){
        newLayer.addChild(this.polygons[i].clone())
    }
    for (var j = parseInt(partner.polygons.length / 2); j < partner.polygons.length; i++){
        newLayer.addChild(partner.polygons[j].clone())
    }
    var baby = new Chromosome(newLayer, this.targetData)
    return baby.mutate();
}

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
                return acc + Math.pow(rgbValue - targetData[i], 2);
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

    for (var i = 0; i < sides; i++){
        polygon.add(new Point(between(0, 128), between(0, 128)))
    }
    polygon.closed = true;
    return polygon;
}



/************************  DEPLOY  *************************** */


// start it up.
var pearlRaster = new Raster('pearl')
var evoPearl = new Evolution(pearlRaster);
var generationBox = document.getElementById('generation');
var runningBox = document.getElementById('running');

var go = function (event) {
    if (event.count % 100 === 0) {
        generationBox.innerHTML = event.count;
        console.log(event.count);
    }
    evoPearl.evolve();
}

view.onMouseDown = function (event){
    view.onFrame = view.onFrame ? null : go;
    runningBox.innerHTML = view.onFrame ? 'Running...' : 'Paused.'
}
