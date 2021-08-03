function __() {}
// Irrelevant comment
Array()
// Another irrelevant comment
/* Comment for Message 1 above */
__('Message 1') // Comment for Message 1 inline
__('Message 2')
/* i18n-extract Message 3 in comments */
// Comment for Message 4
/* i18n-extract Message 4 in comments */ // Comment for Message 4 inline
__('Message 5')
/* Multi-line comment
for message 6 */
__('Message 6')
__('Message 7') /* i18n-ignore-line */
__('Message 8') // i18n-ignore-line
/* i18n-ignore-line */ __('Message 9')
__('Message X') /*
                  * i18n-ignore-line
                  */
