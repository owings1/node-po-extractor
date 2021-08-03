function __(){}
const a = 'a'
// see: https://github.com/oliviertassinari/i18n-extract/blob/9110ba51/src/extractFromCodeFixtures/logicalExpression.js
__(a && 'm1')
__(a || 'm2')
__('m3' || (a && __('m4')))
__(!'mNot')
// see https://github.com/oliviertassinari/i18n-extract/blob/9110ba51/src/extractFromCodeFixtures/ternaryOperator.js
__(a ? a : 'm5')
__(a ? (a.length > 1 ? a : 'm6') : 'm7')
// see https://github.com/oliviertassinari/i18n-extract/blob/9110ba51/src/extractFromCodeFixtures/template.js
__(`m8`)
// see https://github.com/oliviertassinari/i18n-extract/blob/9110ba51/src/extractFromCodeFixtures/dynamicConcat.js
__('k0.' + a)
__('k0.' + a + '.k1')
__(a + '.k1')
__(a)