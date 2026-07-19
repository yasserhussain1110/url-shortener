package com.hussain.urlshortener.controller;

import com.hussain.urlshortener.model.Url;
import com.hussain.urlshortener.repository.UrlRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/check")
@RequiredArgsConstructor
public class StatusController {
    private final UrlRepository urlRepository;

    @GetMapping("/health")
    public ResponseEntity<Void> checkHealth() {
        return ResponseEntity.ok().build();
    }

    @GetMapping("/db")
    public List<Url> checkDB() {
        return urlRepository.findAll();
    }
}
