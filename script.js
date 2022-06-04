function toggleFab(e) {
  $(e).children('i').toggleClass('zmdi-plus');
  $(e).children('i').toggleClass('zmdi-close');
  $(e).toggleClass('is-clicked');
  $('.card').toggleClass('is-active');
}

$('.fab').click(function(e){
  toggleFab($(this));
});


//TO DO
var ENTER_KEY = 13;
var newTodoDom = document.getElementById('new-todo');
var syncDom = document.getElementById('sync-wrapper');

// EDITING STARTS HERE (you dont need to edit anything above this line)

var db = new PouchDB('todo');
var remoteCouch = 'http://admin:1234@146.190.21.225:5984/todo';

db.changes({
  since: 'now',
  live: true
}).on('change', showTodos);

// We have to create a new todo document and enter it in the database
function addTodo(text) {
  var todo = {
    _id: new Date().toISOString(),
    title: text,
    completed: false
  };
  db.put(
    todo
  ).then(function(res){
    //response
  }).catch(function(err){
    console.error(err);
  });
}

// Show the current list of todos by reading them from the database
function showTodos() {
  db.allDocs({
    include_docs: true,
    descending: true
  }).then( function(doc) {
    redrawTodosUI(doc.rows);
  }).catch(function(err){
    console.error(err);
  });
}

function checkboxChanged(todo, event) {
  todo.completed = event.target.checked;
  db.put(todo);
}

// User pressed the delete button for a todo, delete it
function deleteButtonPressed(todo) {
  db.remove(todo);
}

// The input box when editing a todo has blurred, we should save
// the new title or delete the todo if the title is empty
function todoBlurred(todo, event) {
  var trimmedText = event.target.value.trim();
  if (!trimmedText) {
    db.remove(todo);
  } else {
    todo.title = trimmedText;
    db.put(todo);
  }
}

// Initialise a sync with the remote server
function sync() {
  db.sync(remoteCouch, {
    live: true,
    retry: true
  }).on('change', function(info) {
    // handle change
  }).on('paused', function() {
    // replication paused (e.g. user went offline)
    Offline.on('confirmed-up', function() {
      syncDom.setAttribute('data-sync-state', 'syncing');
    });
    Offline.on('confirmed-down', function() {
      syncDom.setAttribute('data-sync-state', 'error');
    });
  }).on('active', function() {
    // replicate resumed (e.g. user went back online)
  }).on('denied', function(info) {
    // a document failed to replicate, e.g. due to permissions
    syncDom.setAttribute('data-sync-state', 'error');
  }).on('complete', function(info) {
    // handle complete
  }).on('error', function(err) {
    syncDom.setAttribute('data-sync-state', 'error');
  });
}

// EDITING STARTS HERE (you dont need to edit anything below this line)

// User has double clicked a todo, display an input so they can edit the title
function todoDblClicked(todo) {
  var div = document.getElementById('li_' + todo._id);
  var inputEditTodo = document.getElementById('input_' + todo._id);
  div.className = 'editing';
  inputEditTodo.focus();
}

// If they press enter while editing an entry, blur it to trigger save
// (or delete)
function todoKeyPressed(todo, event) {
  if (event.keyCode === ENTER_KEY) {
    var inputEditTodo = document.getElementById('input_' + todo._id);
    inputEditTodo.blur();
  }
}

// Given an object representing a todo, this will create a list item
// to display it.
function createTodoListItem(todo) {
  var checkbox = document.createElement('input');
  checkbox.className = 'toggle';
  checkbox.type = 'checkbox';
  checkbox.addEventListener('change', checkboxChanged.bind(this, todo));

  var label = document.createElement('label');
  label.appendChild(document.createTextNode(todo.title));
  label.addEventListener('dblclick', todoDblClicked.bind(this, todo));

  var deleteLink = document.createElement('button');
  deleteLink.className = 'destroy';
  deleteLink.addEventListener('click', deleteButtonPressed.bind(this, todo));

  var divDisplay = document.createElement('div');
  divDisplay.className = 'view';
  divDisplay.appendChild(checkbox);
  divDisplay.appendChild(label);
  divDisplay.appendChild(deleteLink);

  var inputEditTodo = document.createElement('input');
  inputEditTodo.id = 'input_' + todo._id;
  inputEditTodo.className = 'edit';
  inputEditTodo.value = todo.title;
  inputEditTodo.addEventListener('keypress', todoKeyPressed.bind(this, todo));
  inputEditTodo.addEventListener('blur', todoBlurred.bind(this, todo));

  var li = document.createElement('li');
  li.id = 'li_' + todo._id;
  li.appendChild(divDisplay);
  li.appendChild(inputEditTodo);

  if (todo.completed) {
    li.className += 'complete';
    checkbox.checked = true;
  }

  return li;
}

function redrawTodosUI(todos) {
  var ul = document.getElementById('todo-list');
  ul.innerHTML = '';
  todos.forEach(function(todo) {
    ul.appendChild(createTodoListItem(todo.doc));
  });
}

function newTodoKeyPressHandler(event) {
  if (event.keyCode === ENTER_KEY) {
    if(newTodoDom.value){
      addTodo(newTodoDom.value);
      newTodoDom.value = '';
    }
  }
}

function addEventListeners() {
  newTodoDom.addEventListener('keypress', newTodoKeyPressHandler, false);

}

addEventListeners();
showTodos();

if (remoteCouch) {
  sync();
}
