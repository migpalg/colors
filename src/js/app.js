(function () {
  // Estado inicial del app
  var initialState = {
    selectedScreen: 'home',
    isLoading: true,
    difficult: 'easy', // easy | medium | hard
  };

  var CONFIG = {
    difficult: {
      easy: {
        maxTime: 10,
        optionsCount: 3,
        assertPoint: 150,
        dismissPenalty: 160,
      },
      medium: {
        maxTime: 12,
        optionsCount: 4,
        assertPoint: 180,
        dismissPenalty: 185,
      },
      hard: {
        maxTime: 15,
        optionsCount: 6,
        assertPoint: 220,
        dismissPenalty: 222,
      },
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
        '#FF0000',
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
    var gamePointsDisplay = document.getElementById('gamePointsDisplay');
    var stopGameButton = document.getElementById('stopGameButton');
    var gameOptionsGrid = document.getElementById('gameOptionsGrid');
    var gameOptDisplay = document.getElementById('gameOptionDisplay');
    var gameOptTypeDisplay = document.getElementById('gameOptionTypeDisplay');

    /**
     * Prototype that manages the game state
     */
    function Game() {
      this.points = 0;
      this.config = CONFIG.difficult[store.getState().difficult];
      this.isPlaying = false;
      this.timerId = null;
      this.timer = 0;
      this.options = [];   // {color: '', image: ''}
      this.questions = []; // {color: '', image: '', type: ''}
    }

    // Genera una nueva pregunta, con los valores en las opciones y los Muestra
    // en la pantalla
    Game.prototype.generateQuestion = function() {
      // Array.prototype.push() => retorna la nueva longitud del arreglo
      // servirá para poder acceder al último valor insertado
      var lastIndex = this.questions.push({
        // Genera un índice aleatorio y selecciona un ítem del arreglo de
        // opciones
        color: this.options[
          Math.round(Math.random() * (this.config.optionsCount - 1))
        ].color,

        // Genera otro índice aleatorio, pero en este caso para seleccionar
        // aleatoriamente una de las imágenes
        image: this.options[
          Math.round(Math.random() * (this.config.optionsCount - 1))
        ].image,

        // Selecciona una de las opciones de tipos
        type: ['color', 'image'][Math.round(Math.random())]
      });

      // Muestra el tipo de selección que tiene que hacer el usuario por
      // medio de un componente
      gameOptDisplay.innerText = this.questions[lastIndex - 1].type;

      // Muestra el contenido del objeto pregunta
      gameOptTypeDisplay.innerText = this.questions[lastIndex - 1].image;

      // Muestra el color por medio del background
      gameOptTypeDisplay.style.backgroundColor = CONFIG.options.colors[
        this.questions[lastIndex - 1].color
      ];
    };

    Game.prototype.prepareOptions = function() {
      // Variables de ayuda para generar diferentes valores, y para que no
      // se repitan en el arreglo
      var colorOptions = [];
      var imageOptions = [];

      // Mientras las opciones no están listas, genera números aleatorios
      while(
        colorOptions.length < this.config.optionsCount ||
        imageOptions.length < this.config.optionsCount
      ) {
        // Valores aleatorios generados por la máquina
        var imageIndex = Math.round(
          Math.random() * (CONFIG.options.images.length - 1)
        );

        var colorIndex = Math.round(
          Math.random() * (CONFIG.options.colors.length - 1)
        );

        if(
          !imageOptions.includes(imageIndex) &&
          imageOptions.length < this.config.optionsCount
        ) {
          imageOptions.push(imageIndex);
        }

        if(
          !colorOptions.includes(colorIndex) &&
          colorOptions.length < this.config.optionsCount
        ) {
          colorOptions.push(colorIndex);
        }
      }

      // Reduce las opciones generadas a un arreglo de objetos, que nos hará más
      // fácil renderizar las opciones
      this.options = colorOptions.reduce(function(last, current, index) {
        last.push({ color: current, image: imageOptions[index] });
        return last;
      }, []);

      var minWidthHelper = 1;

      if (this.config.optionsCount > 3 && this.config.optionsCount % 2 === 0) {
        minWidthHelper = this.config.optionsCount / 2;
      }

      this.options.forEach(function(option, index) {
        var button = document.createElement('button');

        // Añade la clase para que se le pongan los estilos del
        // game-option
        button.className = 'game-option';

        // Cambia el background de la opción
        button.style.backgroundColor = CONFIG.options.colors[option.color];

        // Cambia el contenido
        button.innerText = option.image;

        if (minWidthHelper > 1) {
          button.style.minWidth = (1 / minWidthHelper * 100) + '%';
        }

        // Añade un escuchador del click
        button.onclick = function() {
          this.validateResponse(index);
        }.bind(this);

        gameOptionsGrid.appendChild(button);
      }.bind(this));
    };

    Game.prototype.validateResponse = function(optionIndex) {
      // Opción seleccionada por el usuario
      var selected = this.options[optionIndex];

      // Ultima pregunta generada por la computadora
      var lastQuestion = this.questions[this.questions.length - 1];

      // Verifica si la pregunta fue respondida correctamente
      if(lastQuestion[lastQuestion.type] === selected[lastQuestion.type]) {
        this.makePoint(); // Realiza un punto!
      } else {
        this.dismiss(); // Resta puntos :(
      }

      // Genera una nueva pregunta
      this.generateQuestion();
    };

    Game.prototype.updateTimerDisplay = function() {
      // Muestra el tiempo faltante en el componente con este proposito
      timerDisplay.innerText = this.timer + 's';
    };

    Game.prototype.updatePointsDisplay = function() {
      gamePointsDisplay.innerText = this.points;
    };

    Game.prototype.makePoint = function() {
      this.points += this.config.assertPoint;
      this.updatePointsDisplay();
    };

    Game.prototype.dismiss = function() {
      this.points -= this.config.dismissPenalty;
      this.updatePointsDisplay();
    };

    // Inicializa el contador y el escuchador de puntajes
    Game.prototype.start = function() {
      if (this.timerId) return;

      // Genera las opciones posibles en el juego
      this.prepareOptions();

      // Configura el tiempo máximo del timer
      this.timer = this.config.maxTime;

      // Mustra los valores iniciales en el display
      this.updateTimerDisplay();
      this.updatePointsDisplay();

      // Se genera la primera pregunta para poder ser respondida
      this.generateQuestion();

      // Inicializa el timer
      this.timerId = setInterval(function() {
        // Arregla los problemas de aproximación de puntos flotantes
        this.timer = Math.round((this.timer - 0.1) * 100) / 100;

        // Para el timer
        if (this.timer === 0) {
          this.stop();
        }

        this.updateTimerDisplay();
      }.bind(this), 100);
    };

    Game.prototype.stop = function() {
      if (!this.timerId) return;

      clearInterval(this.timerId);

      store.dispatch({ type: 'NAVIGATE', screen: 'review' });

      gameOptionsGrid.innerHTML = '';

      this.timerId = null;
    };

    Game.prototype.cancel = function() {
      clearInterval(this.timerId);
      gameOptionsGrid.innerHTML = '';
      store.dispatch({ type: 'NAVIGATE', screen: 'difficult' });
    };

    var game = new Game();

    game.start();

    stopGameButton.onclick = function() {
      game.cancel();
    };
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
