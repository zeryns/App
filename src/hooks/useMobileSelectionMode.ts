import {turnOffMobileSelectionMode} from '@libs/actions/MobileSelectionMode';

import ONYXKEYS from '@src/ONYXKEYS';

import {useIsFocused} from '@react-navigation/native';
import {useEffect, useRef} from 'react';

import useOnyx from './useOnyx';
import usePrevious from './usePrevious';

export default function useMobileSelectionMode(onTurnOffSelectionMode = () => {}) {
    const [isSelectionModeEnabled = false] = useOnyx(ONYXKEYS.RAM_ONLY_MOBILE_SELECTION_MODE);
    const initialSelectionModeValueRef = useRef(isSelectionModeEnabled);
    const prevIsSelectionModeEnabled = usePrevious(isSelectionModeEnabled);
    const isFocused = useIsFocused();

    useEffect(() => {
        // Only clear leftover selection when this subscriber's screen is focused.
        // Background remounts must not wipe selection owned by the focused screen.
        if (!initialSelectionModeValueRef.current || !isFocused) {
            return;
        }
        initialSelectionModeValueRef.current = false;
        turnOffMobileSelectionMode();
    }, [isFocused]);

    useEffect(() => {
        if (!prevIsSelectionModeEnabled || isSelectionModeEnabled) {
            return;
        }
        onTurnOffSelectionMode();
    }, [prevIsSelectionModeEnabled, isSelectionModeEnabled, onTurnOffSelectionMode]);

    return !!isSelectionModeEnabled;
}
