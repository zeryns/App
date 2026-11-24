import type {TravelCVVActionsContextType, TravelCVVStateContextType} from './types';

const defaultTravelCVVStateContextValue: TravelCVVStateContextType = {
    cvv: null,
    isLoading: false,
    validateError: {},
    hasAutoNavigated: false,
};

const defaultTravelCVVActionsContextValue: TravelCVVActionsContextType = {
    setCvv: () => {},
    setIsLoading: () => {},
    setValidateError: () => {},
    setHasAutoNavigated: () => {},
};

export {defaultTravelCVVStateContextValue, defaultTravelCVVActionsContextValue};
