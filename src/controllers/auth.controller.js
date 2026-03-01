const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Función para REGISTRAR
exports.register = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    // 1. Verificamos si el correo ya existe
    const userExists = await User.findOne({ where: { email } });
    if (userExists) return res.status(400).json({ message: 'El correo ya está registrado' });

    // 2. Encriptamos la contraseña (nadie podrá verla en tu base de datos)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Guardamos el usuario en Neon
    const newUser = await User.create({
      email,
      password: hashedPassword,
      role: role || 'client'
    });

    res.status(201).json({ message: 'Usuario creado exitosamente', role: newUser.role });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error });
  }
};

// Función para INICIAR SESIÓN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Buscamos al usuario por correo
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    // 2. Comparamos la contraseña encriptada
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Contraseña incorrecta' });

    // 3. Creamos el Token de sesión (El pase VIP)
    const token = jwt.sign(
      { id: user.id, role: user.role }, 
      'secreto_super_seguro_aling', // En el futuro esto irá en tu archivo .env
      { expiresIn: '24h' } // La sesión dura un día
    );

    res.json({ token, role: user.role, email: user.email });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error });
  }
};