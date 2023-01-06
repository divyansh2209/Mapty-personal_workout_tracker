'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; //in km
    this.duration = duration; //in min.
  }

  _getDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calSpeed();
    this._getDescription();
  }

  calSpeed() {
    //speed in km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._getDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

//APP ARCHITECTURE
class App {
  //private variables
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    this._getPosition();
    this._getLocalStorage();
    form.addEventListener('submit', this._newWorkOut.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click' , this._moveToMarker.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('location not found');
        }
      );
    }
  }

  _loadMap(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    this.#map = L.map('map').setView([latitude, longitude], 16);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 39,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.#map);

    //setting up marker on a click
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work)
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm(){
    form.style.display = 'none';
    form.classList.add('hidden');
    setInterval(() => form.style.display='grid' , 1000);
    inputDistance.value =
    inputDuration.value =
    inputCadence.value =
    inputElevation.value =
      ' ';
  inputDistance.focus();

  }

  _toggleElevationField() {
    //By toggling the same class on both of them we make sure that always one of them is hidden and another one visible
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkOut(e) {
    e.preventDefault();
    //check if the input is valid
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const positiveInputs = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();
    //Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    //If workout running , create running object
    if (type == 'running') {
      const cadence = +inputCadence.value;
      //check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !positiveInputs(distance, duration, cadence)
      ) {
        return alert('Input should be a positive number');
      }
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    //if workout cycling , creare cycling object
    if (type == 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !positiveInputs(distance, duration)
      ) {
        return alert('Input should be a positive number');
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    //add new object to workouts array
    this.#workouts.push(workout);
    //Render markers on the map
    this._renderWorkoutMarker(workout);
    //Render workouts on the list
    this._renderWorkout(workout);
    //Clear input Fields
    this._hideForm();
    //set local storage to all workouts
    this._setLocalStorage();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts' , JSON.stringify(this.#workouts));
  }

  _getLocalStorage(){
    const data = JSON.parse(localStorage.getItem('workouts'));
    if(!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work)
    });
  }

  _renderWorkoutMarker(workout){
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 300,
          minWidth: 50,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${workout.type == 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type == 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          `;

    if (workout.type == 'running') {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>`;
    }

    if (workout.type == 'cycling') {
      html += 
    `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevation}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>`;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToMarker(e){
    const workoutEl = e.target.closest('.workout');

    if(!workoutEl) return ;
    const workout = this.#workouts.find(work => work.id == workoutEl.dataset.id);
    this.#map.setView(workout.coords , 16 , {
      animate: true,
      pan: {
        duration: 1,
      }
    })
  }
}

const app = new App();    
