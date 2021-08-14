import React from 'react';
import ErrorBoundary from './helpers/ErrorBoundary';
import Orderbook from './screens/Orderbook/OrderbookContainer';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ActionSheetProvider>
        <Orderbook />
      </ActionSheetProvider>
    </ErrorBoundary>
  );
};

export default App;
