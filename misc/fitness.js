onmessage = function(e) {
    var rasterData = e.data[0];
    var targetData = e.data[1];

    var workerResult = Math.sqrt(
        rasterData
            .reduce(function(acc, rgbValue, i){
                return acc + Math.pow(rgbValue - targetData[i], 2);
            }, 0)
    )

    postMessage(workerResult);
}