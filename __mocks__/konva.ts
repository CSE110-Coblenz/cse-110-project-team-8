export default {
    Group: jest.fn().mockImplementation(() => ({
        add: jest.fn(),
        getLayer: jest.fn(() => ({ batchDraw: jest.fn() })),
        getClassName: jest.fn(() => 'Group'),
    })),
    Rect: jest.fn().mockImplementation(() => ({
        setAttrs: jest.fn(),
        destroy: jest.fn(),
        position: jest.fn(),
        visible: jest.fn(),
        moveToTop: jest.fn(),
    })),
    Text: jest.fn().mockImplementation(() => ({
        setAttrs: jest.fn(),
        destroy: jest.fn(),
        text: jest.fn(),
        getLayer: jest.fn(() => ({ draw: jest.fn() })),
    })),
};
