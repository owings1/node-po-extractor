# examples/comments

```bash
node example.js
```

Output:

    ------------------
     Without comments 
    ------------------

    ❯ Extracting from file: code.js
    ❯ Extracted 4 key instances
    ❯ Reading file: messages.po
    ❯ Processing po { context: '', language: 'fr', translations: 1 }
    ❯ Totals { added: 3, found: 1, changed: 1, missing: 0 }
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

    ------------------
     With comments 
    ------------------

    ❯ Extracting from file: code.js
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