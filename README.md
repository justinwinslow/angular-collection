angular-collection
==================

Working on my first angular project I realized I wanted to be able to query collections of data and manipulate the models on the collection while keeping everything automatically in sync across views.

Using the angular ui-router for state management means you can nest views trivially. So at the top level you have your `/things` view where you've loaded up things and saved them to `$scope.things`. Now you want to see a specific thing so you navigate to `/things/{id}`. What if you change something on that thing? Using plain ol' angular $resource, you'd have to have a callback that handles either pushing the changes to your collection manually, or query the things again. This would mean more code and more http traffic.

angular-collection is an abstraction for $resource that behaves more like Backbone collections where you can query, add, remove, and manipulate models and the collection keeps track of all that.

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
  <li ng-repeat="thing in things.models">{{ thing.id }}</li>
</ul>
```

### API

* `collection.query()` - Requests collection data
* `collection.get({id})` - Returns model from collection with supplied id
* `collection.add({model})` - Adds model to collection but does not save it
* `collection.save({model})` - Creates a new or updates existing model. Dispatches `POST` or `PUT`
* `collection.remove({model} or {id})` - Deletes model from collection and dispatches `DEL`

All methods return an object that mimics what $resource returns which contains a promise (`collection.query().$promise`), a resolution inidicator (`collection.query().$resolved`), and automatically unwrapped data so you can do `$scope.thing = collection.get({id})` and have directives work as you would expect. The one caveat being, the collection models can be accessed at `$scope.collection.models` so you can do `ng-repeat` as shown in the example above.

### What Isn't Quite Right?

Well, it seems a little weird to have promises on operations that aren't async but I thought it made sense to have all methods return the same thing.

I think Restangular handles nested resources in a slick way where this just doesn't handle them at all. Not sure if there is merit in exploring adding that in some way.

It would be cool to really get Backboney and have model wrappers, or at the very least be able to do `model.save()` and have it all still work but there's no real separation or correlation between models and the collection at the moment.

I'm sure there is other janky or broken stuff but I'm actively developing a commercial application using this and only responding to places where something is broken or doesn't work the way I want to.

### TODO

* Extend Collection with underscore methods
