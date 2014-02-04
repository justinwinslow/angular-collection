angular-collection
==================

Working on my first angular project I realized I wanted to be able to query collections of data and manipulate the models on the collection while keeping everything automatically in sync across views.

Using the angular ui-router for state management means you can nest views trivially. So at the top level you have your `/things` view where you've loaded up things and saved them to `$scope.things`. Now you want to see a specific thing so you navigate to `/things/{id}`. What if you change something on that thing? Using plain ol' angular $resource, you'd have to have a callback that handles either pushing the changes to your collection manually, or query the things again. This would mean more code and more http traffic.

angular-collection is an abstraction for $resource that behaves more like Backbone collections where you can query, add, remove, and manipulate models and the collection keeps track of all that.

### Example

``` javascript
angular.module('someModule', ['ngCollection'])
  .controller('someController', ['$collection', function($collection){
    $scope.things = $collection('things').query();
    $scope.things.$promise.then(function(things){
      console.log(things, $scope.things);
    });
  }]);
```

``` html
<ul>
  <li ng-repeat="thing in things.models">{{ thing.model.id }}</li>
</ul>
```

### API

#### Collection

* `collection.query()` - Requests collection data
* `collection.get(id)` - Returns model from collection with supplied id
* `collection.add({model})` - Adds model to collection but does not save it
* `collection.save()` - Calls model.save() for each model in the collection

#### Model

* `model.get(id)` - Dispatches a `GET` to query single model with supplied id
* `model.save()` - Creates new (`POST`) or updates existing (`PUT`) model
* `model.remove()` - Deletes model with `DEL`

All methods return their model or collection context, mimicking what $resource returns which contains a promise (`collection.$promise`), a resolution inidicator (`collection.$resolved`), and automatically unwrapped data. so you can do `ng-repeat="model in collection.models"` and have directives work as you would expect.

### TODO

* Better collection state persistence when creating/deleting models
* Consider collection directives like `ng-collection-repeat` to make views cleaner
