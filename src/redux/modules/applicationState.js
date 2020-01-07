import DefaultMode from '../../components/ApplicationState';

const VIEWER_CLICK = 'electron-sight/application-state/viewer-click';
const ANIM_CLICK = 'electron-sight/application-state/anim-click';
const BUILD_CLICK = 'electron-sight/application-state/build-click';
const PREDICT_CLICK = 'electron-sight/application-state/predict-click';
const OPEN_FILE = 'electron-sight/application-state/open-file';

export function viewerClick(menu, data) {
    return {
        type: VIEWER_CLICK,
        menu,
        data,
    };
}

export function animClick(menu) {
    return {
        type: ANIM_CLICK,
        menu,
    };
}

export function buildClick(menu) {
    return {
        type: BUILD_CLICK,
        menu,
    };
}

export function predict(menu) {
    return {
        type: PREDICT_CLICK,
        menu,
    };
}

export function openFile(menu, nodeData) {
    return {
        type: OPEN_FILE,
        menu,
        nodeData,
    };
}

const initialState = {
    mode: DefaultMode(),
};

export default function reducer(state = initialState, action = {}) {
    const currentMode = state.mode;
    var nextMode = currentMode;
    switch (action.type) {
        case VIEWER_CLICK:
            nextMode = currentMode.viewerClick(action.menu, action.data);
            break;
        case ANIM_CLICK:
            nextMode = currentMode.animClick(action.menu);
            break;
        case BUILD_CLICK:
            nextMode = currentMode.buildClick(action.menu);
            break;
        case PREDICT_CLICK:
            nextMode = currentMode.predict(action.menu);
            break;
        case OPEN_FILE:
            nextMode = currentMode.openFile(action.menu, action.nodeData);
            break;
        default:
            break;
    }
    return {
        ...state,
        mode: nextMode,
    };
};
