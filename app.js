const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');

const app = express();

// Configuración de la sesión
app.use(session({ secret: 'tu_secreto', resave: false, saveUninitialized: true }));

// Inicializa Passport
app.use(passport.initialize());
app.use(passport.session());

// Configura la estrategia de Google
passport.use(new GoogleStrategy({
    clientID: '',
    clientSecret: '',
    callbackURL: 'http://localhost:8080/auth/google/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    // Aquí puedes guardar el perfil del usuario en tu base de datos
    return done(null, profile);
  }
));

// Serializa el usuario
passport.serializeUser ((user, done) => {
  done(null, user);
});

// Deserializa el usuario
passport.deserializeUser ((user, done) => {
  done(null, user);
});

// Ruta de autenticación
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Ruta de callback
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Autenticación exitosa, redirige a la página principal
    res.redirect('/profile');
  }
);

// Ruta de perfil
app.get('/profile', (req, res) => {
  res.send(`Hola ${req.user.displayName}`);
});

// Inicia el servidor
app.listen(8080, () => {
  console.log('Servidor escuchando en http://localhost:8080');
});