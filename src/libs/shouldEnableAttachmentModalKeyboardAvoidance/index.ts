/**
 * The Android pager keeps its page when it is resized, so the attachment screen keeps its keyboard avoidance.
 */
export default function shouldEnableAttachmentModalKeyboardAvoidance(): boolean {
    return true;
}
