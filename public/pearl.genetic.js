/* eslint radix: 0, id-length: 0 */
/* global Raster, Path, view, project, Point, Color */

/**
 * Evolution
 * Initializes with a population of 6, because it's
 * quite expensive to give birth to a new individual
 * @param {an instance of Raster} raster
 */

/** TODO:
 * Draw pictures on canvas, clear them, 
 * but not as instantaneously as it's happening now.
 */

function Evolution_p6 (raster){
    this.target = getImageData(raster)
    this.population = [];
    this.generation = 0;

    for (var i = 0; i < 6; i++){
        this.population.push(new Chromosome( generateSampleGenome(), this.target ))
    }
}

Evolution_p6.prototype.evolve = function(){ // evolve one generation
    var last = this.population[5];
    this.population = this.population
                        .sort(function(a, b){
                            return a.cost - b.cost
                        })

    this.population.splice(3); // remove 3, then create 3
    for (var i = 0; i < 3; i++){
        this.population.push(
            this.population[i].mate(this.population[parseInt(Math.random() * 3)])
        )
    }
}

Evolution_p6.prototype.step = function(){
    this.evolve();
    project.activeLayer.removeChildren();
    this.population[0].draw();
}

function Evolution_p2 (raster){
    this.target = getImageData(raster)
    this.generation = 0;
    this.parent = new Chromosome( generateSampleGenome(), this.target );
    this.child = new Chromosome( generateSampleGenome(), this.target );
}

Evolution_p2.prototype.evolve = function(){ // evolve one generation
    if (this.child.cost < this.parent.cost){
        this.parent = this.child;
    }
    this.child = new Chromosome(mutate(this.parent.genome), this.target);
    this.generation++;
}

Evolution_p2.prototype.step = function(){
//    console.log('p2 step', this.population[1])
    this.evolve();
    console.log(this.generation)
    project.activeLayer.children = []; // clear out old shapes
    var background = new Path.Rectangle(0, 0, 128, 128)
    background.fillColor = 'black';
    this.parent.draw();
}

/**
 * Chromosome (represents one drawing)
 * Each instantiation of a chromosome calculates its fitness
 * which is O(n*m) where n is 128
 * @param {array} genome
 */
function Chromosome (genome, targetData){
    this.genome = genome;
    this.data = getImageData(genome);
    this.targetData = targetData;
    this.cost = costFn(this.data, targetData);
}

Chromosome.prototype.mate = function (partner) {
    var middle = parseInt(this.genome.length / 2);
    var newGenome = mutate(this.genome.slice(0, middle)).concat(mutate(partner.genome.slice(middle)));
    return new Chromosome(newGenome, this.targetData);
};

Chromosome.prototype.draw = function () {
    drawTriangles(this.genome)
};

/**
 * Mutate the genome before mating
 * Takes an array of arrays.
 * Each inner array represents the instructions for drawing one triangle
 * i.e. [r, g, b, x, y, x, y, x, y]
 * @param {array} genome
 */
function mutate (dna) {
    // [r, g, b, x, y, x, y, x, y]
    // max values = [255, 255, 255, 128, 128, 128, 128, 128, 128]
    var mutated = dna
                    .map(function(code){
                        return code.map(function(val, i){
                                    var rand = Math.random();
                                    var incrementer;
                                    if (i < 3){
                                        incrementer = rand > 0.5 ? between(0, 100) : -1 * between(0, 100)
                                    } else {
                                        incrementer = rand > 0.5 ? between(0, 30) : -1 * between(0, 30)
                                    }
                                    return Math.random() < 0.2 ? val + incrementer : val;
                                });
                    });
    return mutated;
}


/****************************     UTILS     ************************************ */

function getImageData(input){
    var raster;
    if (input instanceof Raster){
        raster = input;
    } else {
        drawTriangles(input) // TODO: how should we clear the triangles later?
        var masterRaster = project.activeLayer.rasterize();
        raster = masterRaster.getSubRaster(0, 0, 128, 128);
        masterRaster.remove();
    }
    raster.remove();
    return raster.getImageData().data;
}

/**
 * Cost function
 * You probably want to delegate this operation to a web worker
 */
function costFn (rasterData, targetData){

    // if (window.Worker){ // offload calculations to web worker
    //     var worker = new Worker('fitness.js')
    //     worker.postMessage([rasterData, targetData]);
    //     worker.onmessage = function(e){
    //         return e.data;
    //     }
    // }

    // else { // if worker doesn't exist, just do it here
        return rasterData
                .reduce(function(acc, rgbValue, i){
                    return acc + Math.pow(rgbValue - targetData[i], 2);
                }, 0)
    // }
}

function between(start, end){
    return start + Math.round((Math.random() * (end - start)));
}

function generateSampleGenome (){
    var sampleGenome = []
    for (var i = 0; i < 50; i++){
        var inner = [];
        for (var j = 0; j < 9; j++){
            if (j < 3){
                inner[j] = between(0, 255);
            } else {
                inner[j] = (j % 2) ?
                    between(0, view.size.width - 2) :
                    between(0, view.size.height - 2);
            }
        }
        sampleGenome.push(inner)
    }
    return sampleGenome;
}

function drawTriangles(genome){
    var triangles = genome
                    .map(function(gene){
                        return drawTriangle(gene)
                    })
    return triangles;
}

function drawTriangle (values){
    var triangle = new Path();
    triangle.fillColor = new Color( // rgba
        values[0] / 255,
        values[1] / 255,
        values[2] / 255,
        0.2
    );
    triangle.add(new Point(values[3], values[4]));
    triangle.add(new Point(values[5], values[6]));
    triangle.add(new Point(values[7], values[8]));
    triangle.closed = true;
    return triangle;
}

var genome = generateSampleGenome();
drawTriangles(genome);

/**************************************************************************** */


// start it up.
var pearlRaster = new Raster('pearl')
var evoPearl = new Evolution_p2(pearlRaster);

// this would take forever and really burden your CPU
// it:
//  does not re-use old triangles
//  does not use web workers right now

var start = function (event) {
    if (event.count === 20) view.onFrame = null;
    evoPearl.step()
}

view.onMouseDown = function (event){
    view.onFrame = view.onFrame ? null : start;
}
