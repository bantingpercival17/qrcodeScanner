import { createApp } from 'vue'
import App from './App.vue'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import axios from 'axios'
if (process.env.NODE_ENV === 'production') {
    axios.defaults.baseURL = 'http://one.bma.edu.ph/api/'
} else {
    axios.defaults.baseURL = 'http://127.0.0.1:7000/api/'
}
createApp(App).mount('#app')
