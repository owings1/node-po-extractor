function __() {}
const obj = {__: () => {}}
obj.a = obj
Array()
__('Message 1 non-member')
obj.__('Message 2 member')
obj.a.a.a.a.__('Message 3 member')