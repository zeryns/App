import type {GetFrozenSplitTransactionIDsParams} from '@libs/SplitExpenseUtils';
import {getFrozenSplitTransactionIDs} from '@libs/SplitExpenseUtils';

function useFrozenSplitTransactionIDs(params: GetFrozenSplitTransactionIDsParams): Set<string> {
    return getFrozenSplitTransactionIDs(params);
}

export default useFrozenSplitTransactionIDs;
