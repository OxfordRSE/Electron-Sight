import chai from 'chai';

import DefaultMode from '../src/ApplicationState';

describe('DefaultMode', function() {
    it('Defaults to DisabledMode', function() {
        chai.assert(DefaultMode().modeName === 'Disabled', 'The usual mode is disabled mode');
    });    
});

