const shouldUseErrorService = () => !__DEV__;

export const captureException = (err: Error) => {
  if (shouldUseErrorService()) {
    /* Notify remote error service: Sentry, Bugsnag, Instabug, etc.  */
  } else {
    console.warn(err);
  }
};
