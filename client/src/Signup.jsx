import React from 'react';
import './index.css';

function Signup() {


    return (
        <div class="container">
            <h2> Create Account</h2>
            <form className="form" id="form">
                <label >Username </label>
                <input type="text" placeholder="userID" id="username"/>
                <i class="fas fa-check-circle"></i>
                <i class="fas fa-exclamation-circle"></i>
                
                
                <label >Password </label>
                <input type="text" placeholder="userID" id="Password"/>
                <i class="fas fa-check-circle"></i>
                <i class="fas fa-exclamation-circle"></i>
                
                
                <label >Email </label>
                <input type="email" placeholder="userID@gmail.com" id="email"/>
                <i class="fas fa-check-circle"></i>
                   
                <button>create</button>
            </form>
        </div>
    );
}

export default Signup;