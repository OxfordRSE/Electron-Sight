let slic = require('../addons/slic/slic');
let chai = require('chai')
let sharp = require('sharp')
let fs = require('fs')
const expect = chai.expect
const assert = chai.assert

it('slic on test image [regression]', function(done) {
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
        var outlabels_arr = Array.from(outlabels)
        assert.equal(outlabels_arr.length, info.width * info.height)
        expect(outlabels_arr).to.eql(labels)
        done();
    });
});
