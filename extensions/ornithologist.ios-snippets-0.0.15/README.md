# iOS Snippets

**iOS Snippets** is a collection of code snippets for iOS/macOS development. And since Visual Studio Code already provides support Swift and Objective-C (grammar and language), this extension is all you need to start coding.

To install this extension, launch VS Code Quick Open (⌘+P), paste ``ext install ios-snippets`` and press enter.

Below, all the snippets bundled in this extension. Fell free to propose new snippets using the [issues](https://github.com/ornithocoder/vscode-ios-snippets/issues) or [pull requests](https://github.com/ornithocoder/vscode-ios-snippets/pulls) pages.

## Swift

* Classes, Protocols, Enums, and Structs
  * ``class`` - Swift Class
  * ``class-subclass`` - Swift Subclass
  * ``protocol`` - Swift Protocol
  * ``struct`` - Swift Struct Declaration
  * ``extension`` - Swift Extension
  * ``enum`` - Swift Enumerated Type Declaration

* Control Flow
  * ``for`` - Swift For Statement
  * ``while`` - Swift While Statement
  * ``docatch`` - Swift Do-Catch Statement
  * ``if`` - Swift If Statement
  * ``ifelse`` - Swift If-Else Statement
  * ``iflet`` - Swift If-Let Statement
  * ``switch`` - Swift Switch Statement
  * ``available`` - Swift API Availability Check Statement
  * ``guard`` - Swift Guard Statement
  * ``guardlet`` - Swift Guard-Let Statement

* Misc
  * ``closure`` - Swift Closure Expression
  * ``defer`` - Swift Defer Statement
  * ``fixme`` - Fix Me (``// FIXME: ...``)
  * ``func`` - Swift Function Statement
  * ``init`` - Swift Initializer Declaration
  * ``let`` - Swift Let Declaration
  * ``let-computed-constant`` - Swift Computed Constant Declaration
  * ``mark`` - Mark (``// MARK: - ...``)
  * ``singleton`` - Swift Singleton (``static let sharedInstance...``)
  * ``todo`` - To Do (``// TODO: ...``)
  * ``typealias`` - Swift Typealias Declaration
  * ``var`` - Swift Var Declaration
  * ``var-computed-variable-get-set`` - Swift Computed Variable Get and Set Declaration
  * ``var-computed-variable-get`` - Swift Computed Variable Get Declaration
  * ``var-lazy-computed-property`` - Swift Lazy Computed Property Declaration
  * ``var-lazy-variable`` - Swift Lazy Stored Variable Declaration

* Testing
  * ``describe`` - Quick Describe Block
  * ``context`` - Quick Context Block
  * ``it`` - Quick It Block
  * ``beforeEach`` - Quick Before Each Block
  * ``afterEach`` - Quick After Each Block

## Objective-C

* Classes and Protocols
  * ``@interface`` - Objective-C Class Declaration
  * ``@interface-extension`` - Objective-C Class Extension
  * ``@interface-category`` - Objective-C Category
  * ``@implementation`` - Objective-C Class Implementation
  * ``@implementation-category`` - Objective-C Category Definition
  * ``@protocol`` - Objective-C Protocol Definition

* Control Flow
  * ``do`` - Objective-C Do-While Statement
  * ``for`` - Objective-C For Statement
  * ``forin`` - Objective-C Fast Enumeration
  * ``if`` - Objective-C If Statement
  * ``ifelse`` - Objective-C If-Else Statement
  * ``switch`` - Objective-C Switch Statement

* Misc
  * ``@property`` - Objective-C Property
  * ``#import-local`` - Import Local Header File
  * ``#import-framework`` - Import Framework Header File
  * ``#pragma`` - Pragma Mark
  * ``enum`` - Objective-C Enumerated Type Declaration (``NS_ENUM``)
  * ``options`` - Objective-C Enumerated Type Declaration (``NS_OPTIONS``)
  * ``init`` - Objective-C -init Method
  * ``initWithCoder`` - Objective-C -initWithCoder: Method
  * ``initWithFrame`` - Objective-C -initWithFrame: Method
  * ``debugDescription`` - Objective-C -debugDescription Method
  * ``description`` - Objective-C -description Method

* Testing
  * ``describe`` - Quick/Specta/Cedar Describe Block
  * ``context`` - Quick/Specta/Cedar Context Block
  * ``it`` - Quick/Specta/Cedar It Block
  * ``beforeEach`` - Quick/Specta/Cedar Before Each Block
  * ``afterEach`` - Quick/Specta/Cedar After Each Block
  * ``expect`` - Expecta Expectation
  * ``mock`` - OCMock Mock Class

* F*block syntax
  * ``block-as-local-variable`` - Block as a local variable
  * ``block-as-method-parameter`` - Block as a method parameter
  * ``block-as-property`` - Block as a property
  * ``block-as-typedef`` - Block as a typedef
  * ``block-as-argument-to-method-call`` - Block as an argument to a method call

## Ruby. Ruby?

* CocoaPods
  * ``pod`` - CocoaPods Pod Declaration
  * ``pod-git-commit`` - CocoaPods Pod from Git Commit (SHA) Declaration
  * ``pod-git-tag`` - CocoaPods Pod from Git Tag Declaration
  * ``pod-local-disk`` - CocoaPods Pod from Local Disk Declaration
  * ``target`` - CocoaPods Target Declaration
  * ``post_install`` - CocoaPods Post Install

In order to make the CocoaPods snippets to work, please edit your Visual Studio Code settings to load ``Podfile`` files as Ruby or install Orta's extension [vscode-ios-common-files](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-ios-common-files).

```json
    "files.associations": {
        "Podfile": "ruby"
    }
```

# Contributing

Want to contribute? Sweet!

1. Fork it on [GitHub](https://github.com/ornithocoder/vscode-ios-snippets)
1. Create a branch (`git checkout -b my_awesome_snippet`)
1. Commit your changes (`git commit -am "Add new awesome snippet"`)
1. Push to the branch (`git push origin my_awesome_snippet`)
1. Open a Pull Request

# License

Copyright (c) 2016 Ornithologist Coder. All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
