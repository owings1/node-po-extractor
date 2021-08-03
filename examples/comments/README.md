# examples/comments

```bash
node example.js 
```

## Output:

    
    ------------------
     Without comments 
    ------------------
     opts: { comments: { extract: false, keyRegex: null, ignoreRegex: null } } 
    ------------------
    
    ❯ Extracting from 1 files
    ❯ Extracted 8 key instances
    ❯ Reading file: messages.po
    ❯ Processing po { context: '', language: 'fr', translations: 1 }
    ❯ Totals { added: 7, found: 1, changed: 1, missing: 0 }
    # Translator comment
    #: code.js:6
    msgid "Message 1"
    msgstr "Le message 1"
    
    #: code.js:7
    msgid "Message 2"
    msgstr ""
    
    #: code.js:11
    msgid "Message 5"
    msgstr ""
    
    #: code.js:14
    msgid "Message 6"
    msgstr ""
    
    #: code.js:15
    msgid "Message 7"
    msgstr ""
    
    #: code.js:16
    msgid "Message 8"
    msgstr ""
    
    #: code.js:17
    msgid "Message 9"
    msgstr ""
    
    #: code.js:18
    msgid "Message X"
    msgstr ""
    
    ------------------
     With comments 
    ------------------
     opts: {
      comments: {
        extract: true,
        keyRegex: /i18n-extract (.+)/,
        ignoreRegex: /i18n-ignore-line/
      }
    } 
    ------------------
    
    ❯ Extracting from 1 files
    ❯ Extracted 6 key instances
    ❯ Reading file: messages.po
    ❯ Processing po { context: '', language: 'fr', translations: 1 }
    ❯ Totals { added: 5, found: 1, changed: 1, missing: 0 }
    # Translator comment
    #: code.js:6
    #. Comment for Message 1 above
    #. Comment for Message 1 inline
    msgid "Message 1"
    msgstr "Le message 1"
    
    #: code.js:7
    msgid "Message 2"
    msgstr ""
    
    #: code.js:8
    msgid "Message 3 in comments"
    msgstr ""
    
    #: code.js:10
    #. Comment for Message 4
    #. Comment for Message 4 inline
    msgid "Message 4 in comments"
    msgstr ""
    
    #: code.js:11
    msgid "Message 5"
    msgstr ""
    
    #: code.js:14
    #. Multi-line comment
    #. for message 6
    msgid "Message 6"
    msgstr ""
    