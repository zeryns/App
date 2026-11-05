import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {CurrencyListActionsContextType} from '@hooks/useCurrencyList';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {PersonalDetailsList, Policy, Report, Rule, Transaction} from '@src/types/onyx';
import type {SplitExpense} from '@src/types/onyx/IOU';
import type {SearchResultDataType} from '@src/types/onyx/SearchResults';

import type {OnyxCollection, OnyxEntry} from 'react-native-onyx';

import {getLoginByAccountID} from './PersonalDetailsUtils';
import {isSplitAction} from './ReportSecondaryActionUtils';
import {isClosedReport, isReportApproved, isSettled} from './ReportUtils';

type GetFrozenSplitTransactionIDsParams = {
    splitExpenses: Array<Pick<SplitExpense, 'transactionID' | 'reportID'>>;
    allTransactions: OnyxCollection<Transaction>;
    allReports: OnyxCollection<Report>;
    fallbackReport: Report | undefined;
    searchResultsData: SearchResultDataType | undefined;
    originalTransaction: OnyxEntry<Transaction>;
    currentUserLogin: string;
    currentUserAccountID: number;
    rules: OnyxCollection<Rule>;
    personalDetails: OnyxEntry<PersonalDetailsList>;
    allPolicies: OnyxCollection<Policy>;
    parentReport: OnyxEntry<Report>;
};

type SplitWarningParams = {
    splitExpenses: SplitExpense[];
    transactionDetailsAmount: number;
    currency: string;
    translate: LocalizedTranslate;
    convertToDisplayString: CurrencyListActionsContextType['convertToDisplayString'];
};

type SplitSaveErrorParams = {
    splitExpenses: SplitExpense[];
    transactionDetailsAmount: number;
    currency: string;
    isDistance: boolean;
    isPerDiem: boolean;
    isCard: boolean;
    translate: LocalizedTranslate;
    convertToDisplayString: CurrencyListActionsContextType['convertToDisplayString'];
};

/**
 * Approved/paid/done report - amount frozen, must not change.
 */
function isSplitExpenseFrozen(splitReport: OnyxEntry<Report>): boolean {
    return isReportApproved({report: splitReport}) || isSettled(splitReport) || isClosedReport(splitReport);
}

/**
 * IDs of the splits that must stay fixed at their current amount: either their own report is already
 * approved/paid/done, or the current user otherwise can't perform the split action on them. Neither can
 * absorb any amount from a split added/removed/edited elsewhere in the same expense.
 */
function getFrozenSplitTransactionIDs({
    splitExpenses,
    allTransactions,
    allReports,
    fallbackReport,
    searchResultsData,
    originalTransaction,
    currentUserLogin,
    currentUserAccountID,
    rules,
    personalDetails,
    allPolicies,
    parentReport,
}: GetFrozenSplitTransactionIDsParams): Set<string> {
    const frozenIDs = new Set<string>();
    for (const item of splitExpenses) {
        const transactionKey = `${ONYXKEYS.COLLECTION.TRANSACTION}${item.transactionID}` as const;
        const itemTransaction = allTransactions?.[transactionKey] ?? searchResultsData?.[transactionKey];
        // Fall back to the split's own cached reportID first - fallbackReport is another split's report.
        const liveReportID = itemTransaction?.reportID ?? item.reportID;
        const reportKey = `${ONYXKEYS.COLLECTION.REPORT}${liveReportID}` as const;
        const itemReport = allReports?.[reportKey] ?? searchResultsData?.[reportKey] ?? fallbackReport;
        const itemPolicy = allPolicies?.[`${ONYXKEYS.COLLECTION.POLICY}${itemReport?.policyID}`];
        const isEditable =
            !itemTransaction ||
            isSplitAction(
                itemReport,
                [itemTransaction],
                originalTransaction,
                currentUserLogin,
                currentUserAccountID,
                rules,
                getLoginByAccountID(itemReport?.ownerAccountID, personalDetails),
                itemPolicy,
                parentReport,
            );
        if (isSplitExpenseFrozen(itemReport) || !isEditable) {
            frozenIDs.add(item.transactionID);
        }
    }
    return frozenIDs;
}

/**
 * Determines whether any split has the same sign as the total and exceeds it in magnitude.
 */
function findInvalidSplit(splitExpenses: SplitExpense[], transactionDetailsAmount: number): SplitExpense | undefined {
    return splitExpenses.find((split) => {
        const sameSign = (split.amount >= 0 && transactionDetailsAmount >= 0) || (split.amount < 0 && transactionDetailsAmount < 0);
        return sameSign && Math.abs(split.amount) > Math.abs(transactionDetailsAmount);
    });
}

/**
 * Computes the inline warning message shown while editing splits (before saving).
 * Returns an empty string when there is nothing to warn about.
 */
function computeSplitWarningMessage({splitExpenses, transactionDetailsAmount, currency, translate, convertToDisplayString}: SplitWarningParams): string {
    const sumOfSplitExpenses = splitExpenses.reduce((acc, item) => acc + (item.amount ?? 0), 0);
    const invalidSplit = findInvalidSplit(splitExpenses, transactionDetailsAmount);
    const difference = sumOfSplitExpenses - transactionDetailsAmount;
    const hasMixedSignSplits = splitExpenses.some((split) => (split.amount ?? 0) < 0 !== transactionDetailsAmount < 0);

    if (invalidSplit && sumOfSplitExpenses !== transactionDetailsAmount) {
        if (hasMixedSignSplits ? difference > 0 : sumOfSplitExpenses > transactionDetailsAmount) {
            return translate('iou.totalAmountGreaterThanOriginal', convertToDisplayString(Math.abs(difference), currency));
        }
        return translate('iou.totalAmountLessThanOriginal', convertToDisplayString(Math.abs(difference), currency));
    }

    if (hasMixedSignSplits ? difference < 0 : sumOfSplitExpenses < transactionDetailsAmount) {
        return translate('iou.totalAmountLessThanOriginal', convertToDisplayString(Math.abs(difference), currency));
    }

    if (hasMixedSignSplits ? difference > 0 : sumOfSplitExpenses > transactionDetailsAmount) {
        return translate('iou.totalAmountGreaterThanOriginal', convertToDisplayString(Math.abs(difference), currency));
    }

    return '';
}

/**
 * Computes the error message shown when the user taps Save, based on the amounts.
 * This covers: splits limit exceeded, per-split/total amount mismatches, and zero-amount splits.
 *
 * Note: navigation-short-circuit cases (one-split identical to original, deep equality with
 * child transactions) are intentionally excluded — those produce no message and are handled
 * by the caller via Navigation.dismissToPreviousRHP().
 *
 * Returns an empty string when there is no amount-based error.
 */
function computeSplitSaveErrorMessage({splitExpenses, transactionDetailsAmount, currency, isDistance, isPerDiem, isCard, translate, convertToDisplayString}: SplitSaveErrorParams): string {
    if (splitExpenses.length > CONST.IOU.SPLITS_LIMIT) {
        return translate('iou.error.manySplitsProvided');
    }

    const sumOfSplitExpenses = splitExpenses.reduce((acc, item) => acc + (item.amount ?? 0), 0);
    const invalidSplit = findInvalidSplit(splitExpenses, transactionDetailsAmount);
    const difference = sumOfSplitExpenses - transactionDetailsAmount;
    const hasMixedSignSplits = splitExpenses.some((split) => (split.amount ?? 0) < 0 !== transactionDetailsAmount < 0);

    if (invalidSplit && sumOfSplitExpenses !== transactionDetailsAmount && !isDistance) {
        if (hasMixedSignSplits ? difference > 0 : sumOfSplitExpenses > transactionDetailsAmount) {
            return translate('iou.totalAmountGreaterThanOriginal', convertToDisplayString(Math.abs(difference), currency));
        }
        return translate('iou.totalAmountLessThanOriginal', convertToDisplayString(Math.abs(difference), currency));
    }

    const sumExceedsTotal = hasMixedSignSplits ? sumOfSplitExpenses > transactionDetailsAmount : Math.abs(sumOfSplitExpenses) > Math.abs(transactionDetailsAmount);
    const sumBelowTotal = hasMixedSignSplits ? sumOfSplitExpenses < transactionDetailsAmount : Math.abs(sumOfSplitExpenses) < Math.abs(transactionDetailsAmount);

    if (sumExceedsTotal && !isDistance) {
        // For mixed-sign splits the arithmetic comparison (sum > total) is already the correct
        // semantic direction, so always use 'Greater'. The sign-based inversion only applies
        // when all splits share the same sign as a negative total.
        const errorKey = !hasMixedSignSplits && transactionDetailsAmount < 0 ? 'iou.totalAmountLessThanOriginal' : 'iou.totalAmountGreaterThanOriginal';
        const greaterThanDifference = sumOfSplitExpenses - transactionDetailsAmount;
        return translate(errorKey, convertToDisplayString(Math.abs(greaterThanDifference), currency));
    }

    if (sumBelowTotal && (isPerDiem || isCard) && !isDistance) {
        const lessThanDifference = transactionDetailsAmount - sumOfSplitExpenses;
        const errorKey = !hasMixedSignSplits && transactionDetailsAmount < 0 ? 'iou.totalAmountGreaterThanOriginal' : 'iou.totalAmountLessThanOriginal';
        return translate(errorKey, convertToDisplayString(Math.abs(lessThanDifference), currency));
    }

    if (splitExpenses.find((item) => item.amount === 0)) {
        return translate('iou.splitExpenseZeroAmount');
    }

    return '';
}

export {computeSplitWarningMessage, computeSplitSaveErrorMessage, getFrozenSplitTransactionIDs, isSplitExpenseFrozen};
export type {GetFrozenSplitTransactionIDsParams};
