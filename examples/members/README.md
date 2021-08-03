# examples/members

```bash
node example.js
```

## Output:

    
    ------------------
     Without members 
    ------------------
     opts: { members: false } 
    ------------------
    
    ❯ Extracting from 1 files
    ❯ Extracted 1 key instances
    ❯ Reading file: messages.po
    ❯ Processing po { context: '', language: 'fr', translations: 0 }
    ❯ Totals { added: 1, found: 0, changed: 0, missing: 0 }
    #: code.js:5
    msgid "Message 1 non-member"
    msgstr ""
    
    ------------------
     With members 
    ------------------
     opts: { members: true } 
    ------------------
    
    ❯ Extracting from 1 files
    ❯ Extracted 3 key instances
    ❯ Reading file: messages.po
    ❯ Processing po { context: '', language: 'fr', translations: 0 }
    ❯ Totals { added: 3, found: 0, changed: 0, missing: 0 }
    #: code.js:5
    msgid "Message 1 non-member"
    msgstr ""
    
    #: code.js:6
    msgid "Message 2 member"
    msgstr ""
    
    #: code.js:7
    msgid "Message 3 member"
    msgstr ""
    