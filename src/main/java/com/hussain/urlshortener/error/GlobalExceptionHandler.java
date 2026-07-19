package com.hussain.urlshortener.error;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(value=HttpStatus.NOT_FOUND, reason="Data not found")
    public void handleResourceNotFound(ResourceNotFoundException ex) {
    }

    @ExceptionHandler(DuplicateException.class)
    @ResponseStatus(value=HttpStatus.CONFLICT, reason="Duplicate Entry Found")
    public void handleDuplicateException(DuplicateException ex) {
    }

}
