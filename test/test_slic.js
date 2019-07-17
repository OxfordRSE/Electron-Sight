let slic = require('../addons/slic/slic');
let chai = require('chai')
let sharp = require('sharp')
let fs = require('fs')
const expect = chai.expect
const assert = chai.assert

it('slic on test image (bee)', function(done) {
    sharp('./test/bee.jpg').ensureAlpha().raw().toBuffer((err, rgbabuf, info) => {
        var labels = require('./bee_slic_outlabels.json')
        var len = rgbabuf.toJSON().data.length
        assert.equal(len, info.width * info.height * 4)
        assert.equal(labels.length, info.width * info.height)
        const [
            outlabels, outLABMeanintensities,
            outPixelCounts, outseedsXY,
            outLABVariances, outCollectedFeatures
        ] = slic.slic(
            new Uint8ClampedArray(rgbabuf.toJSON().data),
            info.width, info.height,
            544) // superpixelSize parameter, this makes the number of superpixels 500
                 // as in the MATLAB code from the authors
        var outlabels_arr = Array.from(outlabels)
        fs.writeFile('./bee_slic_outlabels_actual.json', JSON.stringify(outlabels_arr),
            function (err) {if (err) {console.error('error saving outlabels file');}});
        assert.equal(outlabels_arr.length, info.width * info.height)
        console.log(labels)
        console.log(outlabels_arr)
        expect(outlabels_arr.slice(0,100)).to.eql(labels.slice(0,100))
        done();
    });
});
