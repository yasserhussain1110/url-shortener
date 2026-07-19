package com.hussain.urlshortener.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

// Deliberately returns the requested HTTP status. Used by the load-testing
// suite to exercise error paths. Mounted on /fault (NOT /error) so it doesn't
// overlap with Spring Boot's reserved BasicErrorController error-dispatch path.
@RestController
@RequestMapping("/fault")
public class FaultController {
    @GetMapping("/{statusCode}")
    public ResponseEntity<Void> fault(@PathVariable int statusCode) {
        return ResponseEntity.status(statusCode).build();
    }
}
