# Project purpose
The following project is heavily inspired by the project ["Reedy-for-Chrome"](https://github.com/olegcherr/Reedy-for-Chrome). As this project's license is GPLv2, I shall also license this project under the same license.

The purpose of this project is to create a plugin for the note-taking and knowledge management application [LogSeq](https://logseq.com/) that implements a speed-reading technique called "Rapid Serial Visual Presentation" (RSVP). This technique involves displaying text one word at a time in rapid succession, with customizable speed in Word per Minute (WPM), allowing users to read faster by minimizing eye movement and focusing on individual words.

In my experience this technique is useful in quickly reviewing written content. 

This plugin should allow for a user to speedread an entire LogSeq page or a selected block of text within LogSeq. 

This plugin should be fully compatible with LogSeq's existing features; it should also be compatible with LogSeq's plugin framework and architecture.

# Features
The plugin should include the following features:
- Adjustable reading speed (WPM); the limit should be set by the user, max 10 000 WPM. 
- Start, pause, and stop controls for the speed-reading session.
  - Customizable keyboard shortcuts for controlling the reading session:
  - Basically use the spacebar to start/pause/resume the reading session.
  - Use the escape key to stop the reading session.
  - Use the left and right arrow keys to go back or forward at start of sentence
  - Use the up and down arrow keys to increase or decrease WPM by 50
  - An optional progress bar indicating the current position in the text.
  - settings for font size, font family, and color scheme (light/dark mode).
- Option to read entire page or selected text block (keyboard shortcut, right-click context menu option).
- Compatibility with LogSeq's markdown formatting (e.g., ignoring markdown syntax during speed-reading).
- Support for an option on how to treat punctionation (e.g., pauses on commas, periods, etc.).
- Gradual acceleration/deceleration at the start/end of the reading session. (optional)
  

If possible the easiest way to create this plugin would be to port the existing Reedy-for-Chrome extension to LogSeq's plugin framework.