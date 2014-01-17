angular-collection
==================

Working on my first angular project I realized I wanted to be able to query collections of data and manipulate the models on the collection while keeping everything automatically in sync across views.

Using the angular ui-router for state management means you can nest views trivially. So at the top level you have your `/things` view where you've loaded up things and saved them to `$scope.things`. Now you want to see a specific thing so you navigate to `/things/{id}`. What if you change something on that thing? Using plain ol' angular $resource, you'd have to have a callback that handles either pushing the changes to your collection (`$scope.things`) manually, or query the things again. This would mean more code and more http traffic.

angular-collection behaves more like Backbone collections where you can query, add, remove, and manipulate models and the collection keeps track of all that.

### Example

``` javascript
angular.module('someModule', ['ngCollection'])
  .controller('someController', ['$collection', function($collection){
    $scope.things = $collection('things');
    $scope.things.query().then(function(things){
      console.log(things, $scope.things);
    });
  }]);
```

``` html
<ul>
  <li ng-repeat="thing in scope.things.models">{{ thing.id }}</li>
</ul>
```

### TODO

* Extend Collection with underscore methods
