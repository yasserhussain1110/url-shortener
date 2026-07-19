package com.hussain.urlshortener.controller;

import com.hussain.urlshortener.model.Url;
import com.hussain.urlshortener.service.ShortenerService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/")
@RequiredArgsConstructor
public class UrlController {
    private final ShortenerService shortenerService;

    @GetMapping("/expand/{id}")
    public Url expand(@PathVariable("id") final Long id) {
        return shortenerService.expand(id);
    }

    @PostMapping("/shorten")
    public Url shorten(@RequestBody final Url url) {
        return shortenerService.shorten(url);
    }
}
