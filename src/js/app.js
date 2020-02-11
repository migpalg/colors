(function () {
  // Estado inicial del app
  var initialState = {
    selectedScreen: 'home',
    isLoading: true,
    difficult: 'easy', // easy | medium | hard
  };

  var CONFIG = {
    difficult: {
      easy:   { maxTime: 10, optionsCount: 3 },
      medium: { maxTime: 12, optionsCount: 4 },
      hard:   { maxTime: 15, optionsCount: 6 },
    },
    options: {
      images: [
        'image-1',
        'image-2',
        'image-3',
        'image-4',
        'image-5',
        'image-6',
      ],
      colors: [
        '#FD9EFF',
        '#90AFE8',
        '#ABFFC5',
        '#E8E090',
        '#FFBA97',
        '#FFBA97',
      ],
    },
  };

  // Reductor que servirá para manejar el estado del aplicativo
  function reducer(state, action) {
    if (!state) state = initialState;

    switch (action.type) {
      case 'NAVIGATE':
        return Object.assign(state, {
          selectedScreen: action.screen,
        });
      case 'LOAD_APP':
        return Object.assign(state, {
          isLoading: false
        });
      case 'SET_DIFFICULT':
        return Object.assign(state, {
          difficult: action.difficult,
        });
      default:
        return state;
    }
  }

  // Permite crear un storage para el estado de la aplicación, los storage nos
  // dejan hacer y escuchar acciones
  function createStore(reducer) {
    var state = reducer(null, {});
    var subscriptions = [];

    function Store() { }

    Store.prototype.dispatch = function (action) {
      state = reducer(state, action);
      subscriptions.forEach(function (subscription) { subscription(state); });
    };

    Store.prototype.subscribe = function (subscription) {
      subscriptions.push(subscription);

      return function () {
        subscriptions = subscriptions.filter(function (item) {
          return item !== subscription;
        });
      };
    };

    Store.prototype.getState = function() {
      return state;
    };

    return new Store();
  }

  // Store principal de la aplicación
  var store = createStore(reducer);

  // Retorna una instancia del Juego
  function initGame(store) {
    var timerDisplay = document.getElementById('gameTimerDisplay');

    function Game() {
      this.points = 0;
      this.config = CONFIG.difficult[store.getState().difficult];
      this.isPlaying = false;
      this.timerId = null;
      this.timer = 0;
    }

    // Inicializa el contador y el escuchador de puntajes
    Game.prototype.start = function() {
      if (this.timerId) return;

      this.timer = this.config.maxTime;

      // Inicializa el timer
      this.timerId = setInterval(function() {
        // Arregla los problemas de aproximación de puntos flotantes
        this.timer = Math.round((this.timer - 0.1) * 100) / 100;

        // Para el timer
        if (this.timer === 0) {
          clearInterval(this.timerId);
          this.timerId = null;

          store.dispatch({ type: 'NAVIGATE', screen: 'review' });
        }

        // Muestra el tiempo faltante en el componente con este proposito
        timerDisplay.innerText = this.timer + 's';
      }.bind(this), 100);
    };

    var game = new Game();

    game.start();

    console.log(game.config);
  }

  // Func ión que inicializa todo
  function main() {
    // Pantallas de la aplicación referenciadas en un objeto
    var screens = {
      home: document.getElementById('homeScreen'),
      credits: document.getElementById('creditsScreen'),
      tutorial: document.getElementById('tutorialScreen'),
      difficult: document.getElementById('difficultScreen'),
      game: document.getElementById('gameScreen'),
      review: document.getElementById('reviewScreen'),
    };

    // Botones de selección de dificultad
    document.querySelector('#difficultSwitchButtonsContainer')
      .childNodes.forEach(function(item) {
        if(item.value) {
          item.addEventListener('click', function(event) {
            event.preventDefault();
            navigate('game');
            store.dispatch({
              type: 'SET_DIFFICULT',
              difficult: event.target.value,
            });
            initGame(store);
          });
        }
      });

    // Escuchador de cambio de estado, en este caso para cuando el app deje de
    // recargar, cuando se realiza esta acción el subscriptor desaparece
    var loadingUnsubscribe = store.subscribe(function (state) {
      if (!state.isLoading) {
        var splashScreen = document.getElementById('splashScreen');
        splashScreen.classList.remove('loading');
        splashScreen.addEventListener('transitionend', function (event) {
          if (event.propertyName === 'opacity') {
            splashScreen.parentElement.removeChild(splashScreen);
          }
        });
        loadingUnsubscribe();
      }
    });

    // Escuchador que se encargará de mostrar las páginas seleccionadas
    store.subscribe(function (state) {
      Object.keys(screens).forEach(function (screen) {
        if (screen === state.selectedScreen) {
          screens[screen].classList.add('active');
          return;
        }

        screens[screen].classList.remove('active');
      });
    });

    setTimeout(function () { store.dispatch({ type: 'LOAD_APP' }); }, 2000);

    navigate = function (screen) {
      store.dispatch({ type: 'NAVIGATE', screen: screen });
    };
  }

  // Escuchador del evento onload del window
  window.onload = main;
})();

/**
 * Navega entre diferentes pantallas, luego se sobreescribe su valor
 */
// eslint-disable-next-line no-unused-vars
var navigate = function (screen) { };
