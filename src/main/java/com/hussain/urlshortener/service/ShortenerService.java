package com.hussain.urlshortener.service;

import com.hussain.urlshortener.error.ResourceNotFoundException;
import com.hussain.urlshortener.model.Url;
import com.hussain.urlshortener.repository.UrlRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.net.URI;

@Service
@RequiredArgsConstructor
public class ShortenerService {
    private final UrlRepository urlRepository;

    public URI expand(final Long id) {
        return urlRepository.findById(id)
                .map(Url::getOriginalUrl)
                .map(URI::create)
                .orElseThrow(ResourceNotFoundException::new);
    }

    public Url shorten(final Url url) {
        try {
            return urlRepository.save(url);
        } catch (DataIntegrityViolationException e) {
            return urlRepository.findByOriginalUrl(url.getOriginalUrl())
                    .orElseThrow();
        }
    }
}
