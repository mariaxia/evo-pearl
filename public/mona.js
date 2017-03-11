/**
 * Evolution
 * Initializes with a population of 6, because it's
 * quite expensive to give birth to a new individual
 * @param {an instance of Raster} raster 
 */
function Evolution (raster){
    this.target = getImageData(raster)
    this.population = [];
    this.generation = 0;

    for (var i = 0; i < 6; i++){
        this.population.push(new Chromosome( makeSampleGenome(), this.target ))
    }
}

Evolution.prototype.run = function(){
    while (this.generation++ < 10){
        this.population = this.population
                            .sort(function(a, b){
                                return a.cost - b.cost
                            })
        
        this.population.splice(3); // remove 3, then create 3
        for (var i = 0; i < 3; i++){
            this.population.push(
                this.population[i].mate(this.population[(i + 1) % 3])
            )
        }
    }
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
    this.cost = costFn(this.data, targetData);
}

Chromosome.prototype.mate = function (partner) {
    var middle = parseInt(this.genome.length / 2);
    var newGenome = mutate(this.genome.slice(0, middle)) + mutate(partner.genome.slice(middle));
    return new Chromosome(newGenome);
};

/**
 * Mutate the genome before mating
 * Takes an array of arrays.
 * Each inner array represents the instructions for drawing one triangle
 * i.e. [r, g, b, x, y, x, y, x, y]
 * @param {array} genome 
 */
function mutate (genome) { 
    // [r, g, b, x, y, x, y, x, y]
    // max values = [255, 255, 255, 128, 128, 128, 128, 128, 128]
    var mutated = genome.map(function(val, i){
        var rand = Math.random();
        var incrementer; 
        if (i < 3){
            incrementer = random > 0.5 ? between(0, 50) : -1 * between(0, 50)
            return rand > 0.5 ? val + incrementer : val;
        } else {
            incrementer = random > 0.5 ? between(0, 20) : -1 * between(0, 20)
            return rand > 0.5 ? val + incrementer : val;
        }
    })
}


/****************************     UTILS     ************************************ */

function getImageData(input){
    var raster;
    if (input instanceof Raster){
        raster = input;
    } else {
        drawTriangles(input) // TODO: how should we clear the triangles later?
        raster = project.activeLayer.rasterize() // raster image - no more vector graphics
    }
    raster.remove();
    debugger;
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
                return acc + Math.pow(rgbValue - targetData[i], 2)
            }, 0)
    )
}

function between(start, end){
    return start + Math.round((Math.random() * (end - start)));
}

function makeSampleGenome (raster){
    var sampleGenome = []
    for (var i = 0; i < 50; i++){
        var inner = [];
        for (var j = 0; j < 9; j++){
            if (j < 3){
                inner[j] = between(0, 255);
            } else {
                inner[j] = (j % 2) ? between(0, view.width - 2) : between(0, view.height - 2);
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

var genome = makeSampleGenome(mona);
drawTriangles(genome);

// var triangles = project.activeLayer.rasterize();
// console.log(getImageData(triangles))
// console.log('cost:', costFn(monaAndTriangles))

/**************************************************************************** */


// start it up.
var pearlRaster = new Raster('mona')
var evoPearl = new Evolution(pearlRaster);
evoPearl.run();