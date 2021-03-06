angular-collection
==================

Working on my first angular project I realized I wanted to be able to query collections of data and manipulate the models on the collection while keeping everything automatically in sync across views.

Using the angular ui-router for state management means you can nest views trivially. So at the top level you have your `/things` view where you've loaded up things and saved them to `$scope.things`. Now you want to see a specific thing so you navigate to `/things/{id}`. What if you change something on that thing? Using plain ol' angular $resource, you'd have to have a callback that handles either pushing the changes to your collection manually, or query the things again. This would mean more code and more http traffic.

angular-collection is similar to $resource but behaves more like Backbone collections where you can query, add, remove, and manipulate models and the collection keeps track of all that.

### Example

``` javascript
angular.module('someModule', ['ngCollection'])
  .controller('someController', ['$collection', '$model', function($collection, $model){
    // Create a collection of things
    $scope.things = $collection('/things').query();
    $scope.things.$promise.then(function(things){
      console.log(things, $scope.things);
    });

    // Create a new thing
    var anotherThing = $model('/things', {property, 'value'});

    // Push it to the collection
    $scope.things.push(anotherThing);

    // Save the model
    anotherThing.save();

    // You could also save the whole collection
    $scope.things.save();
  }]);
```

``` html
<!-- Normal ngRepeat way -->
<ul>
  <li ng-repeat="thing in things.models" ng-click="doSomething(thing)">{{ thing.attributes.id }}</li>
</ul>

<!-- ngCollectionRepeat way -->
<ul>
  <li ng-collection-repeat="thing in things" ng-click="doSomething($this)">{{ thing.id }}</li>
</ul>
```

### API

#### Collection

* `collection.query({params})` - Requests collection data (`GET`). Check out https://docs.angularjs.org/api/ng/service/$http for available parameters.
* `collection.sync()` - Refreshes data. This is the prefered method for updating persisted models.
* `collection.add({model})` - Adds model to collection but does not save it (can be object or instantiated `$model`).
* `collection.remove({model})` - Removes model from the collection but does not issue `DEL` (must be intantiated `$model`).
* `collection.save()` - Calls model.save() for each model in the collection.

#### Model

* `model.get(id)` - Dispatches a `GET` to query single model with supplied id.
* `model.save()` - Creates new (`POST`) or updates existing (`PUT`) model.
* `model.remove()` - Deletes model with `DEL` if it has an id. If model was part of collection, this will also remove it from the collection.

All methods return their model or collection context, mimicking what $resource returns which contains a promise (`collection.$promise`), a resolution inidicator (`collection.$resolved`), and automatically unwrapped data. so you can do `ng-repeat="model in collection.models"` and have directives work as you would expect.

### TODO

* Perf test `ng-collection-repeat`
* Error handling
* `ng-collection-options` directive
