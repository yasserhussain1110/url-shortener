package com.hussain.urlshortener.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/error")
public class ErrorController {
    @GetMapping("/{errorCode}")
    public ResponseEntity<Void> error(@PathVariable int errorCode) {
        return ResponseEntity.status(errorCode).build();
    }
}
