import chai from 'chai';
import sinon from 'sinon';
import DefaultMode from '../src/ApplicationState';

describe('DefaultMode', function() {
    it('Defaults to DisabledMode', function() {
        chai.assert(DefaultMode().modeName === 'Disabled', 'The usual mode is disabled mode');
    });    
});

describe('DisabledMode', function() {
    const disabledMode = DefaultMode();
    it('disables all of the UI', function() {
        chai.assert(disabledMode.annotateButtonDisabled(), 'Annotate button disabled');
        chai.assert(disabledMode.brightnessButtonDisabled(), 'Brightness button disabled');
        chai.assert(disabledMode.classifierButtonDisabled(), 'Classifier button disabled');
        chai.assert(disabledMode.contrastButtonDisabled(), 'Contrast button disabled');
        chai.assert(disabledMode.predictButtonDisabled(), 'Predict button disabled');
    });
    it('does not activate any of the buttons', function() {
        chai.assert(disabledMode.annotateButtonActive() === false, 'Annotate button inactive');
        chai.assert(disabledMode.classifierButtonActive() === false, 'Classifier button inactive');
        chai.assert(disabledMode.predictButtonActive() === false, 'Predict button inactive');
    });
    it('stays disabled if you open an unrecognised file type', function() {
        const nodeData = {
            path: '/tmp/filename.pdf',
        };
        const nextMode = disabledMode.openFile(null, nodeData);
        chai.assert(nextMode.modeName === 'Disabled', 'Nothing changes if the file is not opened');
    });
    it('opens a DeepZoom file and transitions to View mode', function() {
        const sandbox = sinon.createSandbox();
        const openSpy = sandbox.spy();
        const menu = {
            props: {
                openseadragon: {
                    open: openSpy,
                },
            },
        };
        const nodeData = {
            path: '/tmp/filename.dzi',
        };
        const nextMode = disabledMode.openFile(menu, nodeData);
        chai.assert(openSpy.calledWith('file:///tmp/filename.dzi'), 'Opened the file using OSD');
        chai.assert(nextMode.modeName === 'View', 'Transition to view mode');
    });
});

describe('ViewMode', function() {
    const menu = { props: { openseadragon: { open: () => {} }}};
    const nodeData = { path: '/tmp/filename.dzi' };
    const viewMode = DefaultMode().openFile(menu, nodeData);
    it('enables all of the buttons', function() {
        chai.assert(viewMode.annotateButtonDisabled() === false);
        chai.assert(viewMode.brightnessButtonDisabled() === false);
        chai.assert(viewMode.contrastButtonDisabled() === false);
        chai.assert(viewMode.classifierButtonDisabled() === false);
        chai.assert(viewMode.predictButtonDisabled() === false);
    });

    it('activates none of the buttons', function() {
        chai.assert(viewMode.annotateButtonActive() === false);
        chai.assert(viewMode.classifierButtonActive() === false);
        chai.assert(viewMode.predictButtonActive() === false);
    });

    it('moves to Annotate mode when you click the Annotate button', function() {
        const sandbox = sinon.createSandbox();
        const annotateSpy = sandbox.spy();
        const menu = { props: { annotations: { startDrawing: annotateSpy } } };
        const nextMode = viewMode.animClick(menu);
        chai.assert(nextMode.modeName === 'Annotate', 'it starts annotating when you click annotate');
        chai.assert(annotateSpy.calledOnce, 'it tells the annotator overlay to start drawing');
    });

    it('moves to Predict mode when you click the Predict button', function() {
        const sandbox = sinon.createSandbox();
        const predictSpy = sandbox.spy();
        const menu = { props: { predict: { startDrawing: predictSpy } } };
        const nextMode = viewMode.predict(menu);
        chai.assert(nextMode.modeName === 'Predict', 'it starts predicting when you click predict');
        chai.assert(predictSpy.calledOnce, 'it tells the predict overlay to start drawing');
    });

    it ('moves to BuildClassifier mode when you click the Build button', function() {
        const sandbox = sinon.createSandbox();
        const item = {
            source: {
                maxLevel: 16,
            }
        };
        const getItem = sandbox.stub().returns(item);
        const buildSpy = sandbox.spy();
        const menu = {
            props: {
                classifier: {
                    startBuilding: buildSpy,
                },
                openseadragon: {
                    world: {
                        getItemAt: getItem,
                    },
                },
            },
            state: {
                superpixel_size: 100,
            },
        };

        const nextMode = viewMode.buildClick(menu);

        chai.assert(nextMode.modeName === 'BuildClassifier');
        chai.assert(buildSpy.calledOnceWithExactly(16, 100), 'Building was started');
    })
});