# weather/or
##### by Dmitry White

A single-page client-side AJAX app to compare weather in two locations.  Available at [dmitrydwhite.github.io/weather-or](http://dmitrydwhite.github.io/weather-or).

### Dependencies:
* Weather Underground API
* jQuery
* [round-to](https://www.npmjs.com/package/round-to)
* SASS for styling
* QUnit for Testing
* Gulp Build and Task-Runner

### Installation:
* Fork and Clone the Repo
* Run `npm install` in the command line

### Do the things:
* `gulp` or `gulp build` to build the project and open in browser window
* `gulp watch` will build, then monitor styles, scripts, and tests for development work
* `gulp test` will compile tests and open the test runner in a browser window
* To get access to running and viewing the QUnit tests from either a local version of the project or the live page, enter the Konami Code for funzies, or just go [here](http://dmitrydwhite.github.io/weather-or/test/test.html)

##### My Build Process (Mostly for me to remember when I go back to working on this after a little while)
* Go ahead and `gulp clean` just to clear out any weird stuff that's hanging around
* Update `master` branch with all the newest, latest, coolest commits
* `git checkout gh-pages`
* `git rebase master gh-pages` (This keeps all my build commits in front of the tip of `master`)
* `gulp build`
* `git add .` (Add in all the newly built `dist` files)
* `git ci -m "Build <m>.<d>.<yy>.<hhhh>` (ID the build with the month, day, year, and time)
* `git push -f` (This overcomes Git's pickiness with the whole "consistent history" thing.  For this branch I do want to amend the history because I want to keep my build history at the tip of the branch, in front of all the working commits)
