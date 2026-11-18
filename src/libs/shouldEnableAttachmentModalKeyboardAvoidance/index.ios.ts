/**
 * On iOS the attachment pager is a SwiftUI TabView, which jumps to the first page when keyboard avoidance squeezes it to zero height
 * while the device rotates with the keyboard open. The PDF password form makes room for the keyboard itself instead.
 */
export default function shouldEnableAttachmentModalKeyboardAvoidance(): boolean {
    return false;
}
