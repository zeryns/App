import getNonEmptyStringOnyxID from '@libs/getNonEmptyStringOnyxID';

import ONYXKEYS from '@src/ONYXKEYS';
import {getReportActionByIDSelector} from '@src/selectors/ReportAction';
import type {ReportActions} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import useOneTransactionThreadReportID from './useOneTransactionThreadReportID';
import useOnyx from './useOnyx';

/**
 * A one-expense report shows the comments of its transaction thread, but Onyx stores them under the thread's reportID.
 * Returns the action with the given ID from that thread. Without a reportActionID it skips the thread lookup.
 */
function useOneTransactionThreadReportAction(reportID: string | undefined, reportActionID: string | undefined) {
    const oneTransactionThreadReportID = useOneTransactionThreadReportID(reportActionID ? reportID : undefined);
    const [reportAction] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${getNonEmptyStringOnyxID(oneTransactionThreadReportID)}`, {
        selector: (reportActions: OnyxEntry<ReportActions>) => getReportActionByIDSelector(reportActions, reportActionID),
    });

    return reportAction;
}

export default useOneTransactionThreadReportAction;
