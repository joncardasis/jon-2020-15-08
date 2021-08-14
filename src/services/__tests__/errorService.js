import * as ErrorService from '../errorService';

describe('errorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.warn.mockRestore();
  });

  describe('captureException', () => {
    describe('when app is in development mode', () => {
      beforeEach(() => (global.__DEV__ = true));

      it('should print error to console warn', () => {
        const error = new Error('fake-error');
        ErrorService.captureException(error);
        expect(console.warn).toHaveBeenCalled();
      });
    });

    describe('when app is bundled', () => {
      beforeEach(() => (global.__DEV__ = false));

      it('should not print error to console warn', () => {
        const error = new Error('fake-error');
        ErrorService.captureException(error);
        expect(console.warn).not.toHaveBeenCalled();
      });
    });
  });
});
