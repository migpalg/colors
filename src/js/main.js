(function () {
  // Estado inicial del app
  var initialState = {
    selectedScreen: 'home',
    isLoading: true,
    difficult: 'easy', // easy | medium | hard
    lastGame: [],
    isPlaying: false,
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
        'circle',
        'diamond',
        'oval',
        'rhombus',
        'square',
        'triangle',
      ],
      colors: [
        'blue',
        'crimson',
        'darkblue',
        'green',
        'purple',
        'yellow',
      ],
    },
    historyStorageKey: 'GAME_HISTORY',
  };

  var gameStorage = {
    generateHistoryEntries: function() {
      var bestGames = this.getBestGames();

      var statsContainer = document.getElementById('statsContainer');

      if (bestGames.length <= 0) {
        var text = document.createElement('p');
        text.classList.add('history-info-text');
        text.innerText = '¡Juega para generar las estadísticas!';
        statsContainer.appendChild(text);
        return;
      }

      statsContainer.innerHTML = '';

      bestGames.forEach(function(game, index) {
        var historyEntry = document.createElement('div');
        var historyImage = document.createElement('img');
        var historyText = document.createElement('div');

        historyEntry.classList.add('d-flex', 'align-items-center', 'history-entry');
        historyImage.classList.add('history-position-image');
        historyText.classList.add('history-entry-text');

        historyImage.setAttribute('src', 'img/stats-positions/' + (index + 1) + '.png');
        historyText.innerHTML = '' +
          '<p>' + game.points + ' puntos</p>' +
          '<p>' + game.correctAnswersCount + ' aciertos</p>' + 
          '<p>' + game.answeredQuestions + ' intentos</p>';

        historyEntry.appendChild(historyImage);
        historyEntry.appendChild(historyText);
        
        statsContainer.appendChild(historyEntry);

      });
    },
    updateDisplays: function() {
      this.generateHistoryEntries();
    },
    putGameStats: function(entry) {

      var items = this.getItems();

      items.push(entry);
      
      localStorage.setItem(CONFIG.historyStorageKey, JSON.stringify(items));

      this.updateDisplays();
    },
    getBestGames: function() {
      var items = this.getItems();

      if (items.length <= 0) { return items; }

      var sorted = items.sort(function(a, b) {
        if (a.points == b.points && !(a.correctAnswersCount == b.correctAnswersCount)) {
          return b.correctAnswersCount - a.correctAnswersCount;
        }

        if (a.correctAnswersCount == b.correctAnswersCount) {
          return b.answeredQuestions - a.answeredQuestions;
        }

        return b.points - a.points;
      });

      return sorted.slice(0, 3);
    },
    getItems: function() {
      return JSON.parse(localStorage.getItem(CONFIG.historyStorageKey) || "[]");
    },
    clear: function() {
      localStorage.removeItem(CONFIG.historyStorageKey);
    }
  };

  gameStorage.updateDisplays();

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
      case 'START_GAME':
        return Object.assign(state, {
          isPlaying: true,
        });
      case 'FINISH_GAME':
        return Object.assign(state, {
          lastGame: action.data,
          isPlaying: false,
        });
      case 'CANCEL_GAME':
        return Object.assign(state, {
          isPlaying: false,
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
    var percentajesDisplays = {
      total: document.getElementById('puntajeTotal'),
      asserts: document.getElementById('assertedPercentaje'),
      dissmissed: document.getElementById('dismissedPercentaje'),
    };
    var gameScreen = document.getElementById('gameScreen');

    function generateAssertBackground(isCorrect) {
      if (typeof isCorrect === 'undefined') { isCorrect = false }

      var assertBackgroundDiv = document.createElement('div');
      assertBackgroundDiv.classList.add('assert-background');
      assertBackgroundDiv.classList.add(isCorrect ? 'assert' : 'error');

      gameScreen.appendChild(assertBackgroundDiv);

      assertBackgroundDiv.addEventListener('transitionend', function() {
        this.remove();
      });

      setTimeout(function() {
        assertBackgroundDiv.classList.remove(isCorrect ? 'assert' : 'error');
      }, 10);
    }

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
      this.questions = []; // {color: '', image: '', type: '', isCorrect: false}
    }

    Game.prototype.getOptionImagePath = function(imageIndex, colorIndex) {
      return 'img/gems/' + CONFIG.options.images[imageIndex] + '/' + CONFIG.options.colors[colorIndex] + '.svg'
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
        type: ['color', 'image'][Math.round(Math.random())],

        // Por defecto el valor de si fue respondida correctamente es null
        isCorrect: null,
      });

      // Muestra el tipo de selección que tiene que hacer el usuario por
      // medio de un componente
      // gameOptDisplay.innerText = this.questions[lastIndex - 1].type;
      gameOptDisplay.setAttribute('src', this.getOptionImagePath(this.questions[lastIndex - 1].image, this.questions[lastIndex - 1].color))

      // Muestra el contenido del objeto pregunta
      gameOptTypeDisplay.innerHTML = this.questions[lastIndex - 1].type === 'image' ? 'Figura' : 'Color';
    };

    Game.prototype.prepareOptions = function() {
      // Variables de ayuda para generar diferentes valores, y para que no
      // se repitan en el arreglo
      var colorOptions = [];
      var imageOptions = [];

      // Mientras las opciones no están listas, genera números aleatorios
      while (
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

        if (
          !imageOptions.includes(imageIndex) &&
          imageOptions.length < this.config.optionsCount
        ) {
          imageOptions.push(imageIndex);
        }

        if (
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

      var minWidthHelper = this.config.optionsCount;

      if (this.config.optionsCount > 3 && this.config.optionsCount % 2 === 0) {
        minWidthHelper = this.config.optionsCount / 2;
      }

      var IMAGES_ASSETS_URLS = [
        'img/gems/stone-background-01.png',
        'img/gems/stone-background-02.png',
      ];

      this.options.forEach(function(option, index) {
        var button = document.createElement('div');
        var image = document.createElement('img');
        var backgroundImage = document.createElement('img')

        // Añade la clase para que se le pongan los estilos del
        // game-option
        button.classList.add('game-option', 'center-items');

        image.classList.add('game-option-image');

        backgroundImage.classList.add('game-option-image-bg');

        image.setAttribute('src', this.getOptionImagePath(option.image, option.color));
        backgroundImage.setAttribute('src', IMAGES_ASSETS_URLS[index % 2]);

        button.appendChild(image);
        button.appendChild(backgroundImage);

        if (minWidthHelper > 1) {
          // button.style.minWidth = (1 / minWidthHelper * 100) + '%';
          gameOptionsGrid.style.gridTemplateColumns = 'repeat(' + minWidthHelper + ', 1fr)';
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

      // Ultima pregunta generada por la computadora, referencia al objeto en la
      // variable
      var lastQuestion = this.questions[this.questions.length - 1];

      // Asigna el valor si es correcto
      lastQuestion.isCorrect =
        lastQuestion[lastQuestion.type] === selected[lastQuestion.type];

      // Verifica si la pregunta fue respondida correctamente
      if (lastQuestion.isCorrect) {
        this.makePoint(); // Realiza un punto!
        generateAssertBackground(true);
      } else {
        this.dismiss(); // Resta puntos :(
        generateAssertBackground(false);
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

      var answeredQuestions = this.questions.filter(function(question) {
        return question.isCorrect !== null;
      });

      var correctAnswersCount = answeredQuestions.filter(function(question) {
        return question.isCorrect;
      }).length;

      percentajesDisplays.total.innerText = 'Puntaje: ' + this.points;
      percentajesDisplays.asserts.innerText = 'Aciertos: ' + correctAnswersCount;
      percentajesDisplays.dissmissed.innerText = 'Intentos: ' + answeredQuestions.length;

      gameStorage.putGameStats({
        answeredQuestions: answeredQuestions.length,
        correctAnswersCount: correctAnswersCount,
        difficult: store.getState().difficult,
        points: this.points,
      }); 

      store.dispatch({ type: 'FINISH_GAME', data: answeredQuestions });
      store.dispatch({ type: 'NAVIGATE', screen: 'review' });

      gameOptionsGrid.innerHTML = '';

      this.timerId = null;
    };

    Game.prototype.cancel = function() {
      clearInterval(this.timerId);
      gameOptionsGrid.innerHTML = '';
      store.dispatch({ type: 'CANCEL_GAME' });
      store.dispatch({ type: 'NAVIGATE', screen: 'difficult' });
    };

    var game = new Game();

    game.start();

    stopGameButton.onclick = function() {
      game.cancel();
    };
  }

  // Función que inicializa todo
  function main() {
    // Pantallas de la aplicación referenciadas en un objeto
    var screens = {
      home: document.getElementById('homeScreen'),
      credits: document.getElementById('creditsScreen'),
      tutorial: document.getElementById('tutorialScreen'),
      difficult: document.getElementById('difficultScreen'),
      game: document.getElementById('gameScreen'),
      review: document.getElementById('reviewScreen'),
      history: document.getElementById('historyScreen')
    };

    // Botones de selección de dificultad
    document.getElementById('difficultSwitchButtonsContainer')
      .childNodes.forEach(function(item) {
        if (!item.dataset) return;

        if(item.dataset.difficult) {
          item.addEventListener('click', function(event) {
            if (store.getState().isPlaying) return;
            event.preventDefault();

            store.dispatch({ type: 'START_GAME' });

            store.dispatch({
              type: 'SET_DIFFICULT',
              difficult: item.dataset.difficult,
            });

            navigate('game');
            
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
      store.dispatch({ type : 'NAVIGATE', screen: screen });
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
