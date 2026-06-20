package com.hussain.urlshortener.controller;

import com.hussain.urlshortener.model.Url;
import com.hussain.urlshortener.service.UrlService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static java.net.URI.create;
import static org.springframework.http.HttpStatus.FOUND;

@RestController
@RequiredArgsConstructor
public class UrlController {
    private final UrlService urlService;

    @GetMapping(path="/all")
    private List<Url> findAll() {
        return urlService.findAll();
    }

    @GetMapping(path="/expand/{id}")
    public ResponseEntity<Void> expand(@PathVariable Long id) {
        String url = urlService.expand(id).getOriginalUrl();

        return ResponseEntity.status(FOUND)
                .location(create(url))
                .build();
    }

    @PostMapping(path="/shorten")
    public Url shorten(@RequestBody Url url) {
        return urlService.shorten(url);
    }

}
